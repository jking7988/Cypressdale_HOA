import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { getLocalStatus } from '../../scripts/member-hub/local.mjs';

function docker(args, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

test('concurrent removals preserve the last admin in real PostgreSQL', async () => {
  getLocalStatus();
  const container = 'supabase_db_cypressdale-member-hub';
  const database = `hoa_concurrency_${Date.now()}`;
  expect(database).toMatch(/^hoa_concurrency_\d+$/);
  const psql = sql => docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At'], sql);
  expect((await docker(['exec', container, 'createdb', '-U', 'postgres', database])).code).toBe(0);
  try {
    const fixture = `
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid; $$;
      create table storage.buckets(id text primary key, name text, public boolean);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
    `;
    const migration = await readFile(new URL('../../supabase/migrations/202610140001_member_hub.sql', import.meta.url), 'utf8');
    const first = '20000000-0000-0000-0000-000000000001';
    const second = '20000000-0000-0000-0000-000000000002';
    const setup = await psql(`${fixture}\n${migration}\n
      insert into auth.users(id, email, email_confirmed_at) values
        ('${first}', 'first@example.test', now()), ('${second}', 'second@example.test', now());
      update public.hoa_profiles set role = 'admin', membership_status = 'approved';
    `);
    expect(setup.code, setup.stderr).toBe(0);
    const results = await Promise.all([first, second].map(id => psql(`
      begin; select pg_sleep(0.2); delete from auth.users where id = '${id}'; select pg_sleep(0.2); commit;
    `)));
    expect(results.filter(result => result.code === 0)).toHaveLength(1);
    expect(results.find(result => result.code !== 0).stderr).toContain('last active admin');
    const remaining = await psql("select count(*) from public.hoa_profiles where role = 'admin'; select count(*) from auth.users;");
    expect(remaining.stdout.trim()).toBe('1\n1');
  } finally {
    expect((await docker(['exec', container, 'dropdb', '-U', 'postgres', '--force', database])).code).toBe(0);
  }
});
