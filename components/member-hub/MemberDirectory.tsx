'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Ban, Search, LoaderCircle } from 'lucide-react';
import { setMembership, inviteAdmin, revokeInvitation } from '@/lib/member-hub/actions';
import type { DirectoryMember, AdminInvitation } from '@/lib/member-hub/forms';
import HubForm from './HubForm';
import RemoveAccount from './RemoveAccount';
import SuccessMessage from './SuccessMessage';

const filters = ['pending', 'approved', 'revoked', 'admins', 'all'] as const;
const labels = { pending: 'Pending', approved: 'Approved', revoked: 'Revoked', admins: 'Admins', all: 'All' };

export default function MemberDirectory({ members, invitations }: { members: DirectoryMember[]; invitations: AdminInvitation[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<typeof filters[number]>('pending');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ error?: string; success?: string }>({});
  const matchesFilter = (member: DirectoryMember, tab: typeof filter) => tab === 'all' || (tab === 'admins'
    ? member.role === 'admin' : member.role === 'resident' && member.membership_status === tab);
  const visible = members.filter(member => matchesFilter(member, filter) &&
    `${member.full_name} ${member.email} ${member.address}`.toLowerCase().includes(search.toLowerCase()));
  async function change(id: string, status: 'approved' | 'revoked') {
    setBusy(id); setNotice({});
    try {
      const form = new FormData(); form.set('id', id); form.set('status', status);
      setNotice(await setMembership(form)); router.refresh();
    } catch { setNotice({ error: 'Unable to update membership. Please try again.' }); }
    finally { setBusy(null); }
  }
  return <>
    <section className="hub-section">
      <div className="hub-directory-tools"><div className="hub-tabs" role="group" aria-label="Membership filter">
        {filters.map(tab => <button key={tab} type="button" aria-pressed={filter === tab} onClick={() => setFilter(tab)}>
          {labels[tab]} <span>{members.filter(member => matchesFilter(member, tab)).length}</span></button>)}
      </div><label className="hub-search"><Search size={17} /><input aria-label="Search residents" placeholder="Search residents" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      {notice.error && <p role="alert" className="hub-message hub-error">{notice.error}</p>}
      <SuccessMessage notice={notice} />
      <div className="hub-table-wrap"><table className="hub-table"><thead><tr><th>Resident</th><th>Address</th><th>Access</th><th>Actions</th></tr></thead>
        <tbody>{visible.map(member => <tr key={member.id}>
          <td><strong>{member.full_name || 'Name not provided'}</strong><span>{member.email}</span>{!member.email_confirmed_at && <span className="hub-unverified">Email unconfirmed</span>}</td>
          <td>{member.address || '-'}</td><td><span className={`hub-status hub-status-${member.membership_status}`}>{member.role === 'admin' ? 'Admin' : labels[member.membership_status]}</span></td>
          <td><div className="hub-row-actions">
            {member.role === 'resident' && member.membership_status !== 'approved' && <button type="button" className="hub-icon" title="Approve membership" aria-label={`Approve ${member.full_name}`}
              disabled={!!busy || !member.email_confirmed_at || !member.full_name || !member.address} onClick={() => change(member.id, 'approved')}><Check size={18} /></button>}
            {member.role === 'resident' && member.membership_status === 'approved' && <button type="button" className="hub-icon" title="Revoke member access" aria-label={`Revoke ${member.full_name}`}
              disabled={!!busy} onClick={() => change(member.id, 'revoked')}><Ban size={18} /></button>}
            {busy === member.id && <LoaderCircle size={17} className="animate-spin" />}
            <RemoveAccount id={member.id} name={member.full_name || member.email} />
          </div></td>
        </tr>)}</tbody>
      </table></div>
      {!visible.length && <p className="hub-empty">No residents match this view.</p>}
    </section>
    <section className="hub-section"><h2>Admin Invitations</h2>
      <div className="hub-invite-form"><HubForm action={inviteAdmin} fields={[{ name: 'email', label: 'Invite by Email', type: 'email', autoComplete: 'email' }]} button="Send Invitation" /></div>
      {invitations.length > 0 && <ul className="hub-invitation-list">{invitations.map(invitation => {
        const status = invitation.accepted_at ? 'Accepted' : invitation.revoked_at ? 'Revoked' : Date.parse(invitation.expires_at) < Date.now() ? 'Expired' : 'Pending';
        return <li key={invitation.id}><div><strong>{invitation.email}</strong><span>{status}</span></div>{status === 'Pending' &&
          <HubForm action={revokeInvitation} fields={[{ name: 'id', label: '', type: 'hidden', value: invitation.id }]} button="Revoke Invitation" />}</li>;
      })}</ul>}
    </section>
  </>;
}
