import Link from 'next/link';
import { ShieldCheck, Clock3, Ban, Settings, FileText, FilePenLine } from 'lucide-react';
import { kindLabels, type ContentKind } from '@/lib/member-hub/content';
import { loadHubPage } from '@/lib/member-hub/pages';
import { signOut } from '@/lib/member-hub/actions';
import { SignOutButton } from '@/components/member-hub/HubForm';

export const metadata = { title: 'Member Hub' };
export default async function Members() {
  const { account, error } = await loadHubPage();
  if (!account?.profile) return <><h1>Member Hub</h1><p className="hub-message">{error}</p></>;
  const { profile, user, client } = account;
  const approved = profile.membership_status === 'approved' && !!user?.email_confirmed_at;
  const status = approved ? 'Approved Member' : profile.membership_status === 'revoked' ? 'Access Revoked' : 'Awaiting Approval';
  const Icon = approved ? ShieldCheck : profile.membership_status === 'revoked' ? Ban : Clock3;
  const { data: content } = approved ? await client.from('hoa_content').select('id, kind, title, updated_at')
    .eq('status', 'published').eq('visibility', 'members').order('updated_at', { ascending: false }).limit(30) : { data: [] };
  return <>
    <div className="hub-page-heading"><div><p className="hub-eyebrow">Cypressdale Residents</p><h1>Member Hub</h1></div><SignOutButton action={signOut} /></div>
    <div className="hub-account-bar"><div><strong>{profile.full_name || user?.email}</strong><p>{profile.address}</p></div>
      <span className={`hub-status hub-status-${profile.membership_status}`}><Icon size={16} />{status}</span></div>
    {!approved && <p className="hub-message" role="status">{profile.membership_status === 'revoked'
      ? 'Your access to member content has been revoked. Contact the HOA to review your membership.'
      : 'Your registration is awaiting admin approval. You will be able to access member content after approval.'}</p>}
    <nav className="hub-toolbar" aria-label="Account tools"><Link className="hub-button hub-secondary" href="/members/account"><Settings size={17} />Account Settings</Link>
      {profile.role === 'admin' && <Link className="hub-button" href="/admin/members"><ShieldCheck size={17} />Manage Members</Link>}</nav>
    {profile.role === 'admin' && <nav className="hub-toolbar"><Link className="hub-button hub-secondary" href="/admin/content"><FilePenLine size={17} />Manage Content</Link></nav>}
    {approved && <section className="hub-section"><h2>Member Updates &amp; Documents</h2>
      {!content?.length ? <p className="hub-empty">No member updates yet.</p> : <ul className="hub-content-list">{content.map(item =>
        <li key={item.id}><FileText size={19} /><div><Link href={`/content/${encodeURIComponent(item.id)}`}><strong>{item.title}</strong></Link><p>{kindLabels[item.kind as ContentKind]}</p></div></li>)}</ul>}
    </section>}
  </>;
}
