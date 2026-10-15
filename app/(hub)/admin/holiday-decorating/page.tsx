import ProgramAdminPage from '@/components/member-hub/ProgramAdminPage';
export const metadata = { title: 'Manage Holiday Decorating' };
export default async function Page({ searchParams }: { searchParams: Promise<{ winner?: string }> }) {
  return <ProgramAdminPage program="holiday" selected={(await searchParams).winner} />;
}
