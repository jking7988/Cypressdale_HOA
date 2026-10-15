import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { loadHubPage } from '@/lib/member-hub/pages';
import MemberDirectory from '@/components/member-hub/MemberDirectory';
import type { DirectoryMember, AdminInvitation } from '@/lib/member-hub/forms';

export const metadata = { title: 'Manage Members' };
export default async function AdminMembers() {
  const { account, error } = await loadHubPage('admin');
  if (!account) return <><h1>Manage Members</h1><p className="hub-message">{error}</p><Link href="/members">Member Hub</Link></>;
  const [members, invitations] = await Promise.all([account.client.rpc('hoa_member_directory'), account.client.rpc('hoa_admin_invitations')]);
  if (members.error || invitations.error) return <p className="hub-message">Unable to load membership records. Please try again.</p>;
  return <><Link href="/members" className="hub-back"><ArrowLeft size={17} />Member Hub</Link>
    <div className="hub-page-heading"><div><p className="hub-eyebrow">Administration</p><h1>Manage Members</h1></div></div>
    <MemberDirectory members={members.data as DirectoryMember[]} invitations={invitations.data as AdminInvitation[]} />
  </>;
}
