import ProgramAdminPage from '@/components/member-hub/ProgramAdminPage';
export const metadata = { title: 'Manage Yard of the Month' };
export default async function Page({ searchParams }: { searchParams: Promise<{ winner?: string }> }) {
  return <ProgramAdminPage program="yard" selected={(await searchParams).winner} />;
}
