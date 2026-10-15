import { notFound } from 'next/navigation';
import HolidayPublicPage from '@/components/content/HolidayPublicPage';
import { isHoliday, holidayPages } from '@/lib/member-hub/holidays';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ holiday: string }> }) {
  const { holiday } = await params;
  return { title: isHoliday(holiday) ? holidayPages[holiday].title : 'Holiday Decorating' };
}
export default async function Page({ params }: { params: Promise<{ holiday: string }> }) {
  const { holiday } = await params;
  if (!isHoliday(holiday)) notFound();
  return <HolidayPublicPage holiday={holiday} />;
}
