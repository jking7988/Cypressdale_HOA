import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const admin = '10000000-0000-0000-0000-000000000001';
const member = '10000000-0000-0000-0000-000000000002';
const pending = '10000000-0000-0000-0000-000000000003';
const unverified = '10000000-0000-0000-0000-000000000004';
const invitee = '10000000-0000-0000-0000-000000000005';

test('member hub permissions and account lifecycle in local PostgreSQL', async (t) => {
  const db = new PGlite();
  try {
    // Only the Supabase-owned schemas are mocked; application SQL runs unchanged.
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create schema storage;
      create table auth.users (
        id uuid primary key, email text, email_confirmed_at timestamptz,
        raw_user_meta_data jsonb not null default '{}'
      );
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth, storage to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
      grant all on auth.users to service_role;
      create table storage.buckets(id text primary key, name text, public boolean);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      grant all on storage.objects to anon, authenticated, service_role;
    `);
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140001_member_hub.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140002_member_directory.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140003_content_editor.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140004_retired_imports.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140005_rsvp_newsletter.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140006_newsletter_limits.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140007_subscriber_removal.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140008_content_type.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140009_document_folders.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140010_asset_libraries.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140011_program_pages.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140012_content_removal.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202610140013_holiday_pages.sql', import.meta.url), 'utf8'));

    async function as(role, id, sql, params = []) {
      assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
      await db.exec('begin');
      try {
        await db.exec(`set local role ${role}`);
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id || '']);
        const result = await db.query(sql, params);
        await db.exec('commit');
        return result.rows;
      } catch (error) {
        await db.exec('rollback');
        throw error;
      }
    }

    for (const [id, email, verified] of [
      [admin, 'admin@example.test', true], [member, 'member@example.test', true],
      [pending, 'pending@example.test', true], [unverified, 'unverified@example.test', false],
      [invitee, 'invitee@example.test', true],
    ]) {
      await db.query(`insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data)
        values ($1, $2, $3, $4)`, [id, email, verified ? new Date().toISOString() : null,
        JSON.stringify({ full_name: 'Test Resident', address: '123 Test Street', role: 'admin', membership_status: 'approved' })]);
    }
    await as('service_role', null, 'select public.hoa_bootstrap_admin($1)', [admin]);
    await as('authenticated', admin, "select public.hoa_set_membership($1, 'approved')", [member]);
    // Force a bad approval with privileged SQL to verify access still requires email confirmation.
    await db.query("update public.hoa_profiles set membership_status = 'approved' where id = $1", [unverified]);
    await db.exec(`
      insert into public.hoa_content(id, kind, title, status, visibility) values
        ('public-event', 'event', 'Public Event', 'published', 'public'),
        ('member-event', 'event', 'Member Event', 'published', 'members'),
        ('drafts.event', 'event', 'Draft Event', 'draft', 'public');
      insert into public.hoa_assets(id, object_path, original_filename, mime_type, size_bytes, sha256) values
        ('public-file', 'public.pdf', 'public.pdf', 'application/pdf', 10, repeat('a', 64)),
        ('member-file', 'member.pdf', 'member.pdf', 'application/pdf', 10, repeat('b', 64)),
        ('draft-file', 'draft.pdf', 'draft.pdf', 'application/pdf', 10, repeat('c', 64));
      insert into public.hoa_content_assets(content_id, asset_id) values
        ('public-event', 'public-file'), ('member-event', 'member-file'), ('drafts.event', 'draft-file');
      insert into storage.objects(bucket_id, name) values ('hoa-content', 'member.pdf');
    `);

    await t.test('content deletion is admin-only, versioned, dependency-safe and preserves uploaded files', async () => {
      await db.exec(`insert into public.hoa_content(id,kind,title,status,visibility,source_revision) values
        ('delete-content','post','Delete fixture','published','public','legacy-delete-revision'),
        ('drafts.delete-content','post','Draft fixture','draft','public',null);
        insert into public.hoa_content_assets(content_id,asset_id) values ('delete-content','public-file');`);
      const remove = (role, user, id = 'delete-content', version = 1) => as(role, user, 'select public.hoa_delete_content($1,$2)', [id, version]);
      await assert.rejects(remove('anon', null), /permission denied/);
      for (const user of [member, pending, unverified]) await assert.rejects(remove('authenticated', user), /Admin access required/);
      await assert.rejects(remove('authenticated', admin, 'delete-content', 2), /Content changed/);
      await assert.rejects(remove('authenticated', admin), /separate draft/);
      await remove('authenticated', admin, 'drafts.delete-content');
      assert.equal((await db.query("select count(*)::int as count from public.hoa_content where id = 'delete-content'")).rows[0].count, 1);
      await db.exec("insert into public.hoa_comments(content_id,display_name,message) values ('delete-content','Fixture','Keep the discussion')");
      await assert.rejects(remove('authenticated', admin), /has comments/);
      await db.exec("delete from public.hoa_comments where content_id = 'delete-content'");
      await db.exec("insert into public.hoa_rsvps(content_id,display_name,status) values ('delete-content','Fixture','yes')");
      await assert.rejects(remove('authenticated', admin), /has RSVPs/);
      await db.exec("delete from public.hoa_rsvps where content_id = 'delete-content'");
      await db.exec(`insert into public.hoa_content(id,kind,title,status,visibility,settings) values
        ('delete-content-ref','page','Reference fixture','draft','public','{"related":{"_ref":"delete-content"}}');`);
      await assert.rejects(remove('authenticated', admin), /Other content references/);
      await db.exec("delete from public.hoa_content where id = 'delete-content-ref'");
      await remove('authenticated', admin);
      assert.equal((await db.query("select count(*)::int as count from public.hoa_content where id = 'delete-content'")).rows[0].count, 0);
      assert.equal((await db.query("select count(*)::int as count from public.hoa_content_assets where content_id = 'delete-content'")).rows[0].count, 0);
      assert.equal((await db.query("select count(*)::int as count from public.hoa_assets where id = 'public-file'")).rows[0].count, 1);
      const [imported] = await as('service_role', null, 'select public.hoa_import_content($1) as restored', [JSON.stringify({
        id: 'delete-content', kind: 'post', title: 'Old backup', status: 'published', visibility: 'public',
        settings: {}, body: [], sections: [], source_revision: 'legacy-delete-revision', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })]);
      assert.equal(imported.restored, false);
      await assert.rejects(remove('authenticated', admin), /Content not found/);
      await assert.rejects(remove('authenticated', admin, 'program-yard-of-the-month'), /dedicated section/);
      await assert.rejects(remove('authenticated', admin, 'program-holiday-decorating'), /dedicated section/);
      await assert.rejects(remove('authenticated', admin, 'program-halloween-decorating'), /dedicated section/);
      await db.exec("insert into public.hoa_content(id,kind,title,status,visibility) values ('delete-document-guard','documentFolder','Protected','draft','public')");
      await assert.rejects(remove('authenticated', admin, 'delete-document-guard'), /dedicated section/);
      await db.exec("delete from public.hoa_content where id = 'delete-document-guard'");
    });

    await t.test('signup metadata cannot grant membership or admin roles', async () => {
      const [profile] = await as('authenticated', pending, 'select role, membership_status from public.hoa_profiles');
      assert.deepEqual(profile, { role: 'resident', membership_status: 'pending' });
      await assert.rejects(as('authenticated', pending,
        "update public.hoa_profiles set role = 'admin' where id = $1", [pending]), /permission denied/);
      await assert.rejects(as('authenticated', pending,
        "select public.hoa_set_membership($1, 'approved')", [pending]), /Admin access required/);
      await assert.rejects(as('authenticated', pending, 'select public.hoa_bootstrap_admin($1)', [pending]), /permission denied/);
    });

    await t.test('public, pending, unverified and approved readers see appropriate content and assets', async () => {
      for (const [role, id, expected] of [
        ['anon', null, ['public-event']], ['authenticated', pending, ['public-event']],
        ['authenticated', unverified, ['public-event']],
        ['authenticated', member, ['member-event', 'public-event']],
        ['authenticated', admin, ['drafts.event', 'member-event', 'public-event']],
      ]) {
        assert.deepEqual((await as(role, id, 'select id from public.hoa_content order by id')).map(row => row.id), [...expected, 'program-halloween-decorating', 'program-holiday-decorating', 'program-yard-of-the-month'].sort());
        const files = (await as(role, id, 'select id from public.hoa_assets order by id')).map(row => row.id);
        assert.equal(files.includes('member-file'), id === member || id === admin);
        assert.equal(files.includes('draft-file'), id === admin);
      }
      assert.equal((await as('authenticated', member, 'select * from storage.objects')).length, 0);
      assert.equal((await as('authenticated', admin, 'select * from storage.objects')).length, 1);
    });

    await t.test('residents cannot read other profiles, edit content, or inspect invitations', async () => {
      assert.deepEqual((await as('authenticated', member, 'select id from public.hoa_profiles')).map(row => row.id), [member]);
      await assert.rejects(as('authenticated', member,
        "insert into public.hoa_content(id, kind, title) values ('injected', 'post', 'Injected')"), /row-level security/);
      await assert.rejects(as('authenticated', member, 'select * from hoa_private.admin_invitations'), /permission denied/);
      assert.equal((await as('authenticated', admin, 'select id from public.hoa_profiles')).length, 5);
      await assert.rejects(as('authenticated', member, 'select * from public.hoa_member_directory()'), /Admin access required/);
      assert.equal((await as('authenticated', admin, 'select * from public.hoa_member_directory()')).length, 5);
    });

    await t.test('approval requires email verification and revocation affects the same session identity', async () => {
      await assert.rejects(as('authenticated', admin,
        "select public.hoa_set_membership($1, 'approved')", [unverified]), /verified email/);
      await as('authenticated', admin, "select public.hoa_set_membership($1, 'revoked')", [member]);
      assert.equal((await as('authenticated', member, "select * from public.hoa_content where id = 'member-event'")).length, 0);
      assert.equal((await as('authenticated', member, "select * from public.hoa_assets where id = 'member-file'")).length, 0);
      await as('authenticated', admin, "select public.hoa_set_membership($1, 'approved')", [member]);
    });

    await t.test('page saves synchronize assets atomically and detect conflicting edits', async () => {
      await db.exec("insert into public.hoa_assets(id,object_path,original_filename,mime_type,size_bytes,sha256) values ('file-editor','editor.pdf','editor.pdf','application/pdf',10,repeat('d',64))");
      const document = { id: 'editor-page', kind: 'page', title: 'Test Page', slug: null, status: 'draft', visibility: 'members',
        body: [], sections: [], settings: { file: { asset: { _ref: 'file-editor' } } } };
      await assert.rejects(as('authenticated', member, 'select public.hoa_save_content($1, null)', [JSON.stringify(document)]), /Admin access required/);
      await as('authenticated', admin, 'select public.hoa_save_content($1, null)', [JSON.stringify(document)]);
      assert.equal((await db.query("select * from public.hoa_content_assets where content_id = 'editor-page'")).rows.length, 1);
      await as('authenticated', admin, 'select public.hoa_save_content($1, 1)', [JSON.stringify({ ...document, title: 'Updated' })]);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, 1)', [JSON.stringify(document)]), /Content changed/);
      await as('authenticated', admin, 'select public.hoa_save_content($1, 2)', [JSON.stringify({ ...document, settings: {} })]);
      assert.equal((await db.query("select * from public.hoa_content_assets where content_id = 'editor-page'")).rows.length, 0);
      const source = { ...document, source_revision: 'new-source', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), published_at: null };
      const [result] = await as('service_role', null, 'select public.hoa_import_content($1)', [JSON.stringify(source)]);
      assert.equal(result.hoa_import_content, false);
      await as('authenticated', admin, 'select public.hoa_save_content($1, null)', [JSON.stringify({ ...document, id: 'editor-public', visibility: 'public', status: 'published' })]);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, 3)', [JSON.stringify({ ...document, status: 'published' })]), /different visibility/);
    });

    await t.test('saved content can change type without losing dependencies or bypassing permissions', async () => {
      const document = { id: 'type-fixture', kind: 'post', title: 'Type Fixture', slug: null,
        status: 'draft', visibility: 'public', body: [], sections: [], settings: {} };
      await as('authenticated', admin, 'select public.hoa_save_content($1, null)', [JSON.stringify(document)]);
      const changed = { ...document, kind: 'event' };
      await assert.rejects(as('authenticated', member, 'select public.hoa_save_content($1, 1)', [JSON.stringify(changed)]), /Admin access required/);
      await as('authenticated', admin, 'select public.hoa_save_content($1, 1)', [JSON.stringify(changed)]);
      assert.equal((await db.query("select kind from public.hoa_content where id = 'type-fixture'")).rows[0].kind, 'event');
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, 1)', [JSON.stringify(document)]), /Content changed/);
      await db.exec("insert into public.hoa_rsvps(content_id, display_name, status) values ('type-fixture', 'Legacy', 'yes')");
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, 2)', [JSON.stringify(document)]), /has RSVPs/);
      await db.exec("delete from public.hoa_rsvps where content_id = 'type-fixture'");
      await db.exec("insert into public.hoa_comments(content_id, display_name, message) values ('type-fixture', 'Legacy', 'Keep this comment')");
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, 2)', [JSON.stringify({ ...document, kind: 'page' })]), /has comments/);
      await as('authenticated', admin, 'select public.hoa_save_content($1, 2)', [JSON.stringify(document)]);
      assert.equal((await db.query("select count(*)::int as count from public.hoa_comments where content_id = 'type-fixture'")).rows[0].count, 1);
      await db.exec("delete from public.hoa_content where id = 'type-fixture'");
      const draft = { ...document, id: 'drafts.type-draft', kind: 'event' };
      await as('authenticated', admin, 'select public.hoa_save_content($1, null)', [JSON.stringify(draft)]);
      await db.exec("insert into public.hoa_comments(content_id, display_name, message) values ('drafts.type-draft', 'Legacy', 'Draft comment')");
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, 1)', [JSON.stringify({ ...draft, kind: 'page', status: 'published' })]), /has comments/);
      assert.equal((await db.query("select count(*)::int as count from public.hoa_content where id = 'type-draft'")).rows[0].count, 0);
      await db.exec("delete from public.hoa_content where id = 'drafts.type-draft'");
      const folder = { ...document, id: 'type-folder', kind: 'documentFolder' };
      await as('authenticated', admin, 'select public.hoa_save_content($1, null)', [JSON.stringify(folder)]);
      await db.exec(`insert into public.hoa_content(id,kind,title,settings) values ('type-document','documentFile','Document','{"folder":{"_ref":"type-folder"}}')`);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, 1)', [JSON.stringify({ ...folder, kind: 'page' })]), /contains documents/);
      await db.exec("delete from public.hoa_content where id = 'type-document'; delete from public.hoa_content where id = 'type-folder';");
    });

    await t.test('document assignments and folder removals preserve the folder tree', async () => {
      await db.exec("update public.hoa_assets set library = 'documents' where id = 'file-editor'");
      const folder = { id: 'folder-fixture', kind: 'documentFolder', title: 'Folder Fixture', slug: null,
        status: 'published', visibility: 'public', body: [], sections: [], settings: {} };
      const save = (row, version = null) => as('authenticated', admin, 'select public.hoa_save_content($1, $2)', [JSON.stringify(row), version]);
      await save(folder);
      const file = { ...folder, id: 'document-fixture', kind: 'documentFile', settings: { folder: { _ref: folder.id }, file: { asset: { _ref: 'file-editor' } } } };
      await assert.rejects(save({ ...file, settings: { ...file.settings, folder: { _ref: 'missing-folder' } } }), /folder is missing/);
      await assert.rejects(save({ ...file, settings: { ...file.settings, folder: { _ref: 'public-post' } } }), /folder is missing/);
      await save(file);
      await assert.rejects(as('authenticated', member, 'select public.hoa_delete_document($1, $2)', [file.id, 1]), /Admin access required/);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_delete_document($1, $2)', [folder.id, 1]), /contains documents/);
      await assert.rejects(as('authenticated', admin, 'delete from public.hoa_content where id = $1', [folder.id]), /contains documents/);
      await assert.rejects(save({ ...folder, status: 'draft' }, 1), /contains published documents/);
      await assert.rejects(save({ ...folder, visibility: 'members' }, 1), /contains published documents/);
      await save({ ...folder, title: 'Renamed Folder' }, 1);
      assert.equal((await db.query('select settings from public.hoa_content where id = $1', [file.id])).rows[0].settings.folder._ref, folder.id);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_delete_document($1, $2)', [file.id, 999]), /Content changed/);
      await save({ ...file, settings: { file: file.settings.file } }, 1);
      await as('authenticated', admin, 'select public.hoa_delete_document($1, $2)', [folder.id, 2]);
      assert.equal((await db.query('select count(*)::int as count from public.hoa_content where id = $1', [file.id])).rows[0].count, 1);
      await as('authenticated', admin, 'select public.hoa_delete_document($1, $2)', [file.id, 2]);
      assert.equal((await db.query("select count(*)::int as count from public.hoa_assets where id = 'file-editor'")).rows[0].count, 1);
      await save({ ...folder, status: 'draft' });
      await assert.rejects(save(file), /requires a published folder/);
      await as('authenticated', admin, 'select public.hoa_delete_document($1, $2)', [folder.id, 1]);
    });

    await t.test('file libraries stay separate and referenced or document files cannot be removed', async () => {
      await as('authenticated', admin, "insert into public.hoa_assets(id,object_path,original_filename,mime_type,size_bytes,sha256,library) values ('file-admin-upload','admin.png','admin.png','image/png',10,repeat('e',64),'files')");
      await db.exec("delete from public.hoa_assets where id = 'file-admin-upload'");
      await db.exec("insert into public.hoa_assets(id,object_path,original_filename,mime_type,size_bytes,sha256) values ('file-unused','unused.pdf','unused.pdf','application/pdf',10,repeat('f',64))");
      await assert.rejects(as('authenticated', member, 'select public.hoa_remove_file($1)', ['file-unused']), /Admin access required/);
      await assert.rejects(as('anon', null, 'select public.hoa_remove_file($1)', ['file-unused']), /permission denied/);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_remove_file($1)', ['public-file']), /in use/);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_remove_file($1)', ['file-editor']), /Document files belong/);
      await assert.rejects(as('authenticated', admin, "update public.hoa_assets set library = 'files' where id = 'file-editor'"), /cannot be changed/);
      const page = { id: 'file-library-page', kind: 'page', title: 'Library Page', slug: null, status: 'draft', visibility: 'public', body: [], sections: [], settings: {}, };
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, null)', [JSON.stringify({ ...page, body: [{ asset: { _ref: 'file-editor' } }] })]), /not available for new content/);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, null)', [JSON.stringify({ ...page, kind: 'documentFile', settings: { file: { asset: { _ref: 'file-unused' } } } })]), /Documents library/);
      await db.query("insert into public.hoa_content(id,kind,title,settings) values ('legacy-shared','event','Legacy Shared','{\"flyer\":{\"asset\":{\"_ref\":\"file-editor\"}}}')");
      await as('authenticated', admin, 'select public.hoa_save_content($1, 1)', [JSON.stringify({ ...page, id: 'legacy-shared', kind: 'event', settings: { flyer: { asset: { _ref: 'file-editor' } } } })]);
      await db.exec("delete from public.hoa_content where id = 'legacy-shared'");
      const removed = await as('authenticated', admin, 'select public.hoa_remove_file($1)', ['file-unused']);
      assert.equal(removed[0].hoa_remove_file.object_path, 'unused.pdf');
      assert.equal((await db.query("select count(*)::int as count from public.hoa_assets where id = 'file-unused'")).rows[0].count, 0);
      assert.equal((await as('service_role', null, 'select public.hoa_retired_asset_ids()'))[0].hoa_retired_asset_ids.includes('file-unused'), true);
      await db.exec("insert into public.hoa_assets(id,object_path,original_filename,mime_type,size_bytes,sha256) values ('file-unused','unused.pdf','unused.pdf','application/pdf',10,repeat('f',64))");
      assert.equal((await db.query("select count(*)::int as count from public.hoa_assets where id = 'file-unused'")).rows[0].count, 0);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_pending_file_cleanup()'), /permission denied/);
      await as('service_role', null, 'select public.hoa_mark_file_cleaned($1)', ['file-unused']);
      assert.deepEqual((await as('service_role', null, 'select public.hoa_pending_file_cleanup()'))[0].hoa_pending_file_cleanup, []);
    });

    await t.test('program pages are admin-editable and protect linked images; winner removal retires imports', async () => {
      await db.exec("insert into public.hoa_assets(id,object_path,original_filename,mime_type,size_bytes,sha256) values ('upload-program-image','program.png','program.png','image/png',10,repeat('9',64))");
      const document = { id: 'program-yard-of-the-month', kind: 'page', title: 'Yard of the Month', slug: null, status: 'published', visibility: 'public', body: [], sections: [],
        settings: { programSettings: { pageTitle: 'New Heading', backgroundImage: { asset: { _ref: 'upload-program-image' } } } } };
      assert.equal((await as('anon', null, "select id from public.hoa_assets where id = 'upload-program-image'")).length, 0);
      await assert.rejects(as('authenticated', member, 'select public.hoa_save_content($1, 1)', [JSON.stringify(document)]), /Admin access required/);
      await as('authenticated', admin, 'select public.hoa_save_content($1, 1)', [JSON.stringify(document)]);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_save_content($1, 1)', [JSON.stringify(document)]), /Content changed/);
      assert.equal((await as('anon', null, "select id from public.hoa_assets where id = 'upload-program-image'")).length, 1);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_remove_file($1)', ['upload-program-image']), /in use/);
      await as('authenticated', admin, 'select public.hoa_save_content($1, 2)', [JSON.stringify({ ...document, settings: {} })]);
      assert.equal((await as('anon', null, "select id from public.hoa_assets where id = 'upload-program-image'")).length, 0);
      const winner = { ...document, id: 'winner-fixture', kind: 'holidayWinner', title: 'Holiday Fixture', settings: { holiday: 'christmas', year: 2026, place: 'shoutout' } };
      await as('authenticated', admin, 'select public.hoa_save_content($1, null)', [JSON.stringify(winner)]);
      await db.exec("update public.hoa_content set source_revision = 'winner-fixture' where id = 'winner-fixture'");
      await assert.rejects(as('authenticated', member, 'select public.hoa_delete_winner($1, $2)', [winner.id, 2]), /Admin access required/);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_delete_winner($1, $2)', [winner.id, 1]), /Content changed/);
      await assert.rejects(as('authenticated', admin, 'select public.hoa_delete_winner($1, $2)', [document.id, 3]), /Winner not found/);
      await as('authenticated', admin, 'select public.hoa_delete_winner($1, $2)', [winner.id, 2]);
      const [result] = await as('service_role', null, 'select public.hoa_import_content($1)', [JSON.stringify({ ...winner, source_revision: 'winner-fixture', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), published_at: null })]);
      assert.equal(result.hoa_import_content, false);
      await db.exec("delete from public.hoa_assets where id = 'upload-program-image'");
    });

    await t.test('address changes require renewed membership approval', async () => {
      await as('authenticated', member, 'update public.hoa_profiles set address = $1 where id = $2', ['456 New Street', member]);
      const [profile] = await as('authenticated', member, 'select membership_status, approved_at from public.hoa_profiles');
      assert.deepEqual(profile, { membership_status: 'pending', approved_at: null });
      await as('authenticated', admin, "select public.hoa_set_membership($1, 'approved')", [member]);
    });

    await t.test('invitation must match the verified account and can only be accepted once', async () => {
      const [{ hoa_issue_admin_invitation: invitation }] = await as('authenticated', admin,
        'select public.hoa_issue_admin_invitation($1)', ['invitee@example.test']);
      await assert.rejects(as('authenticated', member, 'select public.hoa_accept_admin_invitation($1)', [invitation]), /invalid/);
      await as('authenticated', invitee, 'select public.hoa_accept_admin_invitation($1)', [invitation]);
      await assert.rejects(as('authenticated', invitee, 'select public.hoa_accept_admin_invitation($1)', [invitation]), /already used/);
      const [profile] = await as('authenticated', invitee, 'select role from public.hoa_profiles where id = $1', [invitee]);
      assert.equal(profile.role, 'admin');
      await assert.rejects(as('service_role', null, 'select public.hoa_bootstrap_admin($1)', [pending]), /already exists/);
    });

    await t.test('revoked and expired invitations cannot grant admin access', async () => {
      for (const reason of ['revoked', 'expired']) {
        const [{ hoa_issue_admin_invitation: invitation }] = await as('authenticated', admin,
          'select public.hoa_issue_admin_invitation($1)', ['pending@example.test']);
        if (reason === 'revoked') await as('authenticated', admin, 'select public.hoa_revoke_admin_invitation($1)', [invitation]);
        else await db.query("update hoa_private.admin_invitations set expires_at = now() - interval '1 hour' where id = $1", [invitation]);
        await assert.rejects(as('authenticated', pending, 'select public.hoa_accept_admin_invitation($1)', [invitation]), /invalid/);
      }
    });

    await t.test('comments and RSVPs use the account name and reject pending users', async () => {
      const [comment] = await as('authenticated', member,
        `insert into public.hoa_comments(content_id, author_id, display_name, message)
        values ('member-event', $1, 'Spoofed Admin', 'Test comment') returning id, display_name`, [member]);
      assert.equal(comment.display_name, 'Test Resident');
      await as('authenticated', member,
        `insert into public.hoa_rsvps(content_id, author_id, display_name, status)
        values ('member-event', $1, 'Spoofed Admin', 'yes')`, [member]);
      await assert.rejects(as('authenticated', pending,
        `insert into public.hoa_comments(content_id, author_id, display_name, message)
        values ('public-event', $1, 'Name', 'Denied')`, [pending]), /row-level security/);
      await assert.rejects(as('authenticated', member,
        `insert into public.hoa_comments(content_id, author_id, display_name, message)
        values ('public-event', $1, 'Name', 'Denied')`, [pending]), /Invalid author/);
      await assert.rejects(as('anon', null, 'select * from public.hoa_rsvps'), /permission denied/);
    });

    await t.test('RSVP totals preserve historical baselines and repeated responses do not double-count', async () => {
      await db.query(`update public.hoa_content set settings = '{"rsvpYes":5,"rsvpMaybe":2}' where id = 'public-event'`);
      await db.query(`insert into public.hoa_rsvps(source_id,content_id,display_name,status) values ('rsvp-fixture','public-event','Legacy','yes')`);
      const [{hoa_rsvp_summary:before}] = await as('anon',null,'select public.hoa_rsvp_summary($1)',['public-event']);
      assert.equal(before.yes,5); assert.equal(before.maybe,2);
      await assert.rejects(as('authenticated',pending,'select public.hoa_set_rsvp($1,$2)',['public-event','yes']),/Approved membership/);
      await as('authenticated',member,'select public.hoa_set_rsvp($1,$2)',['public-event','yes']);
      const [{hoa_set_rsvp:twice}] = await as('authenticated',member,'select public.hoa_set_rsvp($1,$2)',['public-event','yes']);
      assert.equal(twice.yes,6);
      const [{hoa_set_rsvp:changed}] = await as('authenticated',member,'select public.hoa_set_rsvp($1,$2)',['public-event','maybe']);
      assert.equal(changed.yes,5); assert.equal(changed.maybe,3);
      await as('authenticated',member,'select public.hoa_set_rsvp($1,$2)',['public-event',null]);
      await assert.rejects(as('anon',null,'select public.hoa_rsvp_summary($1)',['member-event']),/Event not found/);
      await db.query(`delete from public.hoa_rsvps where source_id = 'rsvp-fixture'`);
    });

    await t.test('newsletter consent and campaign claims are atomic and private', async () => {
      await assert.rejects(as('anon',null,'select * from public.newsletter_subscribers'),/permission denied/);
      await assert.rejects(as('authenticated',member,'select public.hoa_confirm_newsletter($1)',['secret']),/permission denied/);
      await as('service_role',null,'select public.hoa_request_newsletter($1,$2,$3,$4)',['member@example.test','Newsletter Name','Test Street','token1']);
      assert.equal((await db.query(`select active from public.newsletter_subscribers where email='member@example.test'`)).rows[0].active,false);
      const [{hoa_confirm_newsletter:confirmed}]=await as('service_role',null,'select public.hoa_confirm_newsletter($1)',['token1']); assert.equal(confirmed,true);
      assert.equal((await as('service_role',null,'select public.hoa_confirm_newsletter($1)',['token1']))[0].hoa_confirm_newsletter,false);
      await db.query(`update public.newsletter_subscribers set active=false,verification_sent_at=now()-interval '2 minutes' where email='member@example.test'`);
      await as('service_role',null,'select public.hoa_request_newsletter($1,$2,$3,$4)',['member@example.test','Spoofed','Changed','token2']);
      const sub=(await db.query(`select active,name from public.newsletter_subscribers where email='member@example.test'`)).rows[0];
      assert.equal(sub.active,false); assert.equal(sub.name,'Newsletter Name');
      await db.query(`update public.newsletter_subscribers set verification_expires_at=now()-interval '1 second' where email='member@example.test'`);
      assert.equal((await as('service_role',null,'select public.hoa_confirm_newsletter($1)',['token2']))[0].hoa_confirm_newsletter,false);
      await db.query(`update public.newsletter_subscribers set verification_expires_at=now()+interval '1 hour' where email='member@example.test'`);
      await as('service_role',null,'select public.hoa_confirm_newsletter($1)',['token2']);
      const [{hoa_start_newsletter:run}]=await as('service_role',null,'select public.hoa_start_newsletter($1,$2,$3)',['fixture','{}','mailpit']);
      assert.equal((await as('service_role',null,'select public.hoa_start_newsletter($1,$2,$3)',['fixture','{}','mailpit']))[0].hoa_start_newsletter,run);
      const claim='20000000-0000-0000-0000-000000000001';
      assert.equal((await as('service_role',null,'select * from public.hoa_claim_newsletter($1,$2)',[run,claim])).length,1);
      assert.equal((await as('service_role',null,'select * from public.hoa_claim_newsletter($1,$2)',[run,claim])).length,0);
      await db.query(`update public.newsletter_deliveries set lease_until=now()-interval '1 second' where run_id=$1`,[run]);
      const reclaimed=await as('service_role',null,'select * from public.hoa_claim_newsletter($1,$2)',[run,claim]);
      assert.equal(reclaimed.length,1); assert.equal(reclaimed[0].attempts,2);
      await as('authenticated',member,'select public.hoa_prepare_account_removal($1,$2)',[member,true]);
    });

    await t.test('deleting an account clears authors while preserving comments, replies and RSVPs', async () => {
      const [{ id: parent }] = await db.query('select id from public.hoa_comments where author_id = $1', [member]).then(result => result.rows);
      await as('authenticated', admin,
        `insert into public.hoa_comments(content_id, parent_id, author_id, display_name, message)
        values ('member-event', $1, $2, 'Admin', 'Reply retained')`, [parent, admin]);
      await db.query('insert into hoa_private.legacy_contacts(source_id, verified_owner_id, email) values ($1, $2, $3)', ['legacy-comment', member, 'member@example.test']);
      await db.query(`insert into public.hoa_comments(source_id, content_id, display_name, message)
        values ('legacy-comment', 'public-event', 'Legacy Name', 'Legacy comment')`);
      await db.query('delete from auth.users where id = $1', [member]);
      assert.equal((await db.query(`select active from public.newsletter_subscribers where email='member@example.test'`)).rows[0].active,false);
      const rows = await db.query("select author_id, display_name from public.hoa_comments where id = $1 or source_id = 'legacy-comment'", [parent]);
      assert.equal(rows.rows.length, 2);
      assert.ok(rows.rows.every(row => row.author_id === null && row.display_name === 'User Cleared'));
      const rsvps = await db.query('select author_id, display_name from public.hoa_rsvps');
      assert.deepEqual(rsvps.rows, [{ author_id: null, display_name: 'User Cleared' }]);
      assert.equal((await db.query('select * from public.hoa_comments where parent_id = $1', [parent])).rows.length, 1);
      assert.equal((await db.query('select * from public.hoa_profiles where id = $1', [member])).rows.length, 0);
      assert.equal((await db.query('select * from hoa_private.legacy_contacts where verified_owner_id = $1', [member])).rows.length, 0);
    });

    await t.test('last admin protection rolls back Auth and profile deletion together', async () => {
      await db.query(`insert into public.newsletter_subscribers(email,active,verified) values ('admin@example.test',true,true)`);
      await as('authenticated',admin,'select public.hoa_prepare_account_removal($1,$2)',[admin,true]);
      await db.query('delete from auth.users where id = $1', [invitee]);
      // An unverified account must not count as an available replacement admin.
      await db.query("update public.hoa_profiles set role = 'admin' where id = $1", [unverified]);
      await assert.rejects(db.query('delete from auth.users where id = $1', [admin]), /last active admin/);
      assert.equal((await db.query(`select active from public.newsletter_subscribers where email='admin@example.test'`)).rows[0].active,true);
      await assert.rejects(db.query("update public.hoa_profiles set role = 'resident' where id = $1", [admin]), /last active admin/);
      assert.equal((await db.query('select id from auth.users where id = $1', [admin])).rows.length, 1);
      assert.equal((await db.query('select id from public.hoa_profiles where id = $1', [admin])).rows.length, 1);
    });

    await t.test('removed subscribers cannot be restored by imports but can confirm a fresh signup',async()=>{
      const document = JSON.stringify({email:'retired@example.test',name:'Retired Fixture',active:true,verified:true});
      await assert.rejects(as('authenticated',admin,'select public.hoa_import_newsletter_subscriber($1)',[document]),/permission denied/);
      assert.equal((await as('service_role',null,'select public.hoa_import_newsletter_subscriber($1)',[document]))[0].hoa_import_newsletter_subscriber,true);
      await as('service_role',null,`delete from public.newsletter_subscribers where email='retired@example.test'`);
      assert.equal((await as('service_role',null,'select public.hoa_import_newsletter_subscriber($1)',[document]))[0].hoa_import_newsletter_subscriber,false);
      assert.equal((await db.query(`select id from public.newsletter_subscribers where email='retired@example.test'`)).rows.length,0);
      await as('service_role',null,'select public.hoa_request_newsletter($1,$2,$3,$4)',['retired@example.test','Fresh Signup',null,'fresh-token']);
      assert.equal((await db.query(`select active from public.newsletter_subscribers where email='retired@example.test'`)).rows[0].active,false);
      assert.equal((await as('service_role',null,'select public.hoa_confirm_newsletter($1)',['fresh-token']))[0].hoa_confirm_newsletter,true);
    });

    await t.test('newsletter request limits are enforced in the database',async()=>{
      await db.query(`insert into public.newsletter_subscribers(email,verification_sent_at)
        select 'limit-'||i||'@example.test',now() from generate_series(1,30) i`);
      await assert.rejects(as('service_role',null,'select public.hoa_request_newsletter($1,$2,$3,$4)',
        ['blocked@example.test',null,null,'blocked']),/request limit/);
      await assert.rejects(as('service_role',null,'select public.hoa_request_newsletter_management($1)',
        ['member@example.test']),/request limit/);
    });
  } finally {
    await db.close();
  }
});
