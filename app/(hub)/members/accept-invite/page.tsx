import { loadHubPage } from '@/lib/member-hub/pages';
import HubForm from '@/components/member-hub/HubForm';
import { acceptInvitation } from '@/lib/member-hub/actions';
export const metadata = { title: 'Accept Admin Invitation' };
export default async function AcceptInvite({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { account, error } = await loadHubPage();
  const { id } = await searchParams;
  if (!account?.profile || !id) return <p className="hub-message">{error || 'This invitation link is invalid.'}</p>;
  return <div className="hub-auth"><h1>Admin Invitation</h1><p className="hub-subtitle">{account.user?.email}</p>
    <HubForm action={acceptInvitation} fields={[
      { name: 'id', type: 'hidden', label: '', value: id },
      { name: 'full_name', label: 'Full Name', autoComplete: 'name', value: account.profile.full_name, maxLength: 200 },
      { name: 'password', label: 'Set Password', type: 'password', autoComplete: 'new-password', minLength: 12 },
    ]} button="Accept Admin Invitation" />
  </div>;
}
