import { loadHubPage } from '@/lib/member-hub/pages';
import AdminNavigation from '@/components/member-hub/AdminNavigation';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { account, error } = await loadHubPage('admin');
  return account ? <><AdminNavigation />{children}</> : <p className="hub-message">{error}</p>;
}
