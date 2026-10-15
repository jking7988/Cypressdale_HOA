import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { adaptNewsletterSchema, buildExistingProjectBaseline } from './prepare-existing-project.mjs';

import { legacySchema } from './fixtures/existing-project-schema.mjs';

test('existing-project baseline preserves live data, isolates campaign IDs and keeps old server writes compatible', async t => {
  const db = new PGlite();
  try {
    await db.exec(legacySchema);
    const beforeSubscribers = (await db.query('select * from public.newsletter_subscribers order by email')).rows;
    const beforeHistory = (await db.query('select * from public.newsletter_runs order by id')).rows;
    const { sql } = await buildExistingProjectBaseline();
    await db.exec(sql);

    await t.test('every newly created table has RLS and internal bookkeeping rejects client reads', async () => {
      const unprotected = await db.query(`select n.nspname, c.relname from pg_class c
        join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p')
        and not c.relrowsecurity and (n.nspname='hoa_private'
          or (n.nspname='public' and c.relname ~ '^hoa_'))`);
      assert.deepEqual(unprotected.rows, []);
      for (const role of ['anon', 'authenticated']) {
        for (const table of ['account_removal_preferences', 'newsletter_retirements']) {
          await db.exec(`begin; set local role ${role};`);
          await assert.rejects(db.query(`select * from hoa_private.${table}`), /permission denied/);
          await db.exec('rollback');
        }
      }
    });

    await t.test('subscriber identities, profiles, consent, timestamps and old links are unchanged', async () => {
      const columns = Object.keys(beforeSubscribers[0]).join(',');
      assert.deepEqual((await db.query(`select ${columns} from public.newsletter_subscribers order by email`)).rows, beforeSubscribers);
      const tokens = (await db.query('select unsubscribe_token from public.newsletter_subscribers')).rows.map(row => row.unsubscribe_token);
      assert.equal(new Set(tokens).size, 3);
      assert.ok(tokens.every(Boolean));
    });

    await t.test('legacy bigint history is separate from UUID hub campaigns', async () => {
      assert.deepEqual((await db.query('select * from public.newsletter_runs order by id')).rows, beforeHistory);
      const run = (await db.query("select public.hoa_start_newsletter('resend:2099-10-31', '{}', 'resend') as id")).rows[0].id;
      assert.match(run, /^[a-f0-9-]{36}$/);
      assert.equal((await db.query('select count(*)::int as n from public.hoa_newsletter_runs')).rows[0].n, 1);
      assert.equal((await db.query('select count(*)::int as n from public.hoa_newsletter_deliveries')).rows[0].n, 1);
      assert.equal((await db.query('select count(*)::int as n from public.newsletter_runs')).rows[0].n, 2);
      const claimed = await db.query('select * from public.hoa_claim_newsletter($1, gen_random_uuid())', [run]);
      assert.equal(claimed.rows.length, 1);
      assert.equal(claimed.rows[0].subscriber_id, beforeSubscribers.find(row => row.email === 'active@example.test').id);
    });

    await t.test('old service-role signups, verification and history inserts still work', async () => {
      await db.exec(`set role service_role;
        insert into public.newsletter_subscribers(email,active,verified,verification_token)
          values ('old-site@example.test',true,false,'old-site-token');
        update public.newsletter_subscribers set verified=true where verification_token='old-site-token';
        insert into public.newsletter_runs default values;
        reset role;`);
      assert.equal((await db.query("select verified from public.newsletter_subscribers where email='old-site@example.test'")).rows[0].verified, true);
      assert.equal((await db.query('select count(*)::int as n from public.newsletter_runs')).rows[0].n, 3);
    });

    await t.test('new confirmation cannot reactivate an unsubscribe before mailbox confirmation', async () => {
      await db.query("select public.hoa_request_newsletter('unsubscribed@example.test','New Name',null,'new-hash')");
      assert.equal((await db.query("select active from public.newsletter_subscribers where email='unsubscribed@example.test'")).rows[0].active, false);
      await db.query("select public.hoa_confirm_newsletter('new-hash')");
      assert.equal((await db.query("select active from public.newsletter_subscribers where email='unsubscribed@example.test'")).rows[0].active, true);
    });

    await t.test('anonymous and ordinary authenticated clients cannot read newsletter contacts or history', async () => {
      for (const role of ['anon', 'authenticated']) {
        for (const table of ['newsletter_subscribers', 'newsletter_runs', 'hoa_newsletter_runs', 'hoa_newsletter_deliveries']) {
          await db.exec(`begin; set local role ${role};`);
          await assert.rejects(db.query(`select * from public.${table}`), /permission denied/);
          await db.exec('rollback');
        }
      }
    });

    await t.test('existing chat, map and uploads are retained without altering storage policies', async () => {
      assert.equal((await db.query('select count(*)::int as n from public.messages')).rows[0].n, 1);
      assert.equal((await db.query('select count(*)::int as n from public.resident_map_entries')).rows[0].n, 1);
      assert.equal((await db.query("select count(*)::int as n from storage.objects where bucket_id='chat-uploads'")).rows[0].n, 1);
      assert.equal((await db.query("select count(*)::int as n from pg_policies where policyname='legacy_chat_storage'")).rows[0].n, 1);
      assert.equal((await db.query("select public from storage.buckets where id='hoa-content'")).rows[0].public, false);
    });

    await t.test('a repeat baseline refuses to run rather than replacing installed data', async () => {
      await assert.rejects(db.exec(sql), /Hub objects already exist/);
      await db.exec('rollback');
      assert.equal((await db.query('select count(*)::int as n from public.newsletter_runs')).rows[0].n, 3);
    });
  } finally { await db.close(); }
});

test('unexpected schema or non-normalized email fails before creating hub objects', async () => {
  const { sql } = await buildExistingProjectBaseline();
  for (const change of [
    "alter table public.newsletter_runs alter column id type text using id::text",
    "update public.newsletter_subscribers set email='MixedCase@example.test' where email='pending@example.test'",
  ]) {
    const db = new PGlite();
    try {
      await db.exec(legacySchema);
      await db.exec(change);
      await assert.rejects(db.exec(sql), /schema differs|explicit reconciliation/);
      await db.exec('rollback');
      assert.equal((await db.query("select to_regclass('public.hoa_content') as table_name")).rows[0].table_name, null);
    } finally { await db.close(); }
  }
});

test('offline adapter refuses a changed source migration boundary', () => {
  assert.throws(() => adaptNewsletterSchema('select 1;', 'select 2;'), /boundaries changed/);
});

test('a late installation error rolls back hub objects and retains existing subscriber and storage data', async () => {
  const db = new PGlite();
  try {
    await db.exec(legacySchema);
    await db.exec("insert into storage.buckets values ('hoa-content', 'Existing conflicting bucket', false)");
    const before = (await db.query('select * from public.newsletter_subscribers order by email')).rows;
    const { sql } = await buildExistingProjectBaseline();
    await assert.rejects(db.exec(sql), /duplicate key/);
    await db.exec('rollback');
    assert.equal((await db.query("select to_regnamespace('hoa_private') as schema_name")).rows[0].schema_name, null);
    assert.deepEqual((await db.query('select * from public.newsletter_subscribers order by email')).rows, before);
    assert.equal((await db.query("select count(*)::int as n from storage.buckets where id='hoa-content'")).rows[0].n, 1);
  } finally { await db.close(); }
});
