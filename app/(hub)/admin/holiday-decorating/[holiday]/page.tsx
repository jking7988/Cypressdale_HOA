import { notFound } from 'next/navigation';
import ProgramAdminPage from '@/components/member-hub/ProgramAdminPage';
import { isHoliday } from '@/lib/member-hub/holidays';
export default async function Page({ params, searchParams }: { params: Promise<{ holiday: string }>; searchParams: Promise<{ winner?: string }> }) {
  const { holiday } = await params;
  if (!isHoliday(holiday)) notFound();
  return <ProgramAdminPage program="holiday" holiday={holiday} selected={(await searchParams).winner} />;
}
