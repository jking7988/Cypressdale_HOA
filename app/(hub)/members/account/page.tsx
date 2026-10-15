import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { loadHubPage } from '@/lib/member-hub/pages';
import { saveProfile } from '@/lib/member-hub/actions';
import HubForm from '@/components/member-hub/HubForm';
import RemoveAccount from '@/components/member-hub/RemoveAccount';

export const metadata = { title: 'Account Settings' };
export default async function AccountSettings() {
  const { account, error } = await loadHubPage();
  if (!account?.profile) return <p className="hub-message">{error}</p>;
  return <div className="hub-settings"><Link href="/members" className="hub-back"><ArrowLeft size={17} />Member Hub</Link><h1>Account Settings</h1>
    <p className="hub-subtitle">{account.user?.email}</p>
    <section className="hub-section"><h2>Resident Details</h2>
      <HubForm action={saveProfile} fields={[
        { name: 'full_name', label: 'Full Name', autoComplete: 'name', value: account.profile.full_name, maxLength: 200 },
        { name: 'address', label: 'Cypressdale Address', autoComplete: 'street-address', value: account.profile.address, maxLength: 500 },
      ]} button="Save Details" />
      {account.profile.role === 'resident' && <p className="hub-subtitle">An address change requires renewed admin approval.</p>}
    </section>
    <section className="hub-section"><h2>Password</h2><Link href="/forgot-password">Send a Password Reset Link</Link></section>
    <section className="hub-section"><h2>Delete Account</h2><p className="hub-subtitle">Your personal details will be removed. Comments and RSVPs will remain under User Cleared.</p>
      <RemoveAccount id={account.profile.id} name={account.profile.full_name} self />
    </section>
  </div>;
}
