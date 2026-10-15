import AuthPage from '@/components/member-hub/AuthPage';
export const metadata = { title: 'Member Sign In' };
export default async function Login({ searchParams }: { searchParams: Promise<{ removed?: string; link?: string }> }) {
  const params = await searchParams;
  return <AuthPage mode="login" message={params.removed ? 'Your account has been removed.' : params.link ? 'This email link has expired or is invalid. Please request a new link.' : undefined} />;
}
