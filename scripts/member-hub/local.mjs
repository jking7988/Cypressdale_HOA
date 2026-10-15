import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

export const localAdmin = { email: 'admin@cypressdale.test', password: 'CypressdaleLocal2026!' };
export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

export function getLocalStatus() {
  const cli = fileURLToPath(new URL('../../node_modules/supabase/dist/supabase.js', import.meta.url));
  const result = spawnSync(process.execPath, [cli, 'status', '-o', 'json'], { cwd: projectRoot, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Start the local member-hub Supabase stack first.');
  const status = JSON.parse(result.stdout);
  if (status.API_URL !== 'http://127.0.0.1:55421' || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
    throw new Error('Expected the isolated member-hub stack on port 55421.');
  }
  return status;
}

export async function seedAdmin(status = getLocalStatus()) {
  const service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const publicClient = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  let { data, error } = await publicClient.auth.signInWithPassword(localAdmin);
  if (error) {
    const created = await service.auth.admin.createUser({ ...localAdmin, email_confirm: true,
      user_metadata: { full_name: 'Local HOA Admin', address: 'Local Testing Only' } });
    if (created.error) throw new Error('Unable to create the local test admin.');
    ({ data, error } = await publicClient.auth.signInWithPassword(localAdmin));
  }
  if (error || !data.user) throw new Error('Unable to sign in the local test admin.');
  const { data: profile } = await service.from('hoa_profiles').select('role').eq('id', data.user.id).single();
  if (profile?.role !== 'admin') {
    const { error: bootstrapError } = await service.rpc('hoa_bootstrap_admin', { target_id: data.user.id });
    if (bootstrapError) throw new Error('Local admin bootstrap failed; no existing admin was changed.');
  }
  await publicClient.auth.signOut({ scope: 'local' });
  return { service, id: data.user.id };
}
