import AuthPage from '@/components/member-hub/AuthPage';
import { loadHubPage } from '@/lib/member-hub/pages';
export const metadata = { title: 'Reset Password' };
export default async function Reset() {
  const { error } = await loadHubPage();
  return error ? <p className="hub-message">{error}</p> : <AuthPage mode="reset" />;
}
