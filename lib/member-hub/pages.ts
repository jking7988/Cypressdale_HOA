import 'server-only';
import { redirect } from 'next/navigation';
import { createHubSessionClient, getHubAccount, HubAccessError } from './server';

export async function loadHubPage(required: 'account' | 'member' | 'admin' = 'account') {
  try {
    const account = await getHubAccount(await createHubSessionClient(), required);
    return { account, error: null };
  } catch (error) {
    if (error instanceof HubAccessError && error.status === 401) redirect(required === 'admin' ? '/admin-sign-in' : '/login');
    return { account: null, error: error instanceof HubAccessError ? error.message : 'Member access is temporarily unavailable.' };
  }
}
