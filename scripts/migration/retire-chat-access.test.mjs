import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { legacySchema } from './fixtures/existing-project-schema.mjs';

test('chat retirement blocks client access without removing records or restricting other buckets', async () => {
  const db = new PGlite();
  try {
    await db.exec(legacySchema);
    await db.exec(`insert into storage.buckets values ('hoa-content','Hub files',false);
      insert into storage.objects(bucket_id,name) values ('hoa-content','keep-hub-file');
      create policy hub_fixture_read on storage.objects for select to public using (bucket_id='hoa-content');`);
    await db.exec(await readFile(new URL('./retire-chat-access.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query("select public from storage.buckets where id='chat-uploads'")).rows[0].public, false);
    assert.equal((await db.query('select count(*)::int as n from public.messages')).rows[0].n, 1);
    assert.equal((await db.query('select count(*)::int as n from storage.objects')).rows[0].n, 2);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`begin; set local role ${role};`);
      assert.deepEqual((await db.query('select name from storage.objects')).rows, [{ name: 'keep-hub-file' }]);
      await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('chat-uploads','blocked')"), /row-level security/);
      await db.exec('rollback');
      await db.exec(`begin; set local role ${role};`);
      await assert.rejects(db.query('select * from public.messages'), /permission denied/);
      await db.exec('rollback');
    }
  } finally { await db.close(); }
});
