import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hubConfig, hubServiceRoleKey, HubAccessError } from './config';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export { HubAccessError } from './config';

export type HubProfile = {
  id: string;
  full_name: string;
  address: string;
  role: 'resident' | 'admin';
  membership_status: 'pending' | 'approved' | 'revoked';
};

export async function createHubSessionClient() {
  const { url, publishableKey, secureCookies } = hubConfig();
  const store = await cookies();
  return createServerClient(url, publishableKey, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Server components read cookies; the proxy refreshes them. */ }
      },
    },
  });
}

export async function getHubAccount(client: SupabaseClient, required: 'optional' | 'account' | 'member' | 'admin' = 'account', accessToken?: string) {
  const { data: { user }, error } = await client.auth.getUser(accessToken);
  if (error || !user) {
    if (required === 'optional' && !accessToken) return { client, profile: null, user: null };
    throw new HubAccessError(401, 'Please sign in again.');
  }
  const { data, error: profileError } = await client.from('hoa_profiles')
    .select('id, full_name, address, role, membership_status').eq('id', user.id).single();
  if (profileError || !data) throw new HubAccessError(403, 'Account access is unavailable.');
  const profile = data as HubProfile;
  if (required === 'member' || required === 'admin') {
    if (!user.email_confirmed_at || profile.membership_status !== 'approved') {
      throw new HubAccessError(403, 'Approved membership is required.');
    }
    if (required === 'admin' && profile.role !== 'admin') throw new HubAccessError(403, 'Admin access is required.');
  }
  return { client, profile, user };
}

export function createHubUserClient(accessToken?: string): SupabaseClient {
  const { url, publishableKey } = hubConfig();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export function createHubStorageClient(): SupabaseClient {
  const { url } = hubConfig();
  const key = hubServiceRoleKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function getHubRequestContext(request: Request, required: 'optional' | 'account' | 'member' | 'admin' = 'account') {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return getHubAccount(await createHubSessionClient(), required);
  }
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match) throw new HubAccessError(401, 'Please sign in again.');
  const client = createHubUserClient(match[1]);
  return getHubAccount(client, required, match[1]);
}
