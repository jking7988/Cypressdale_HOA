export const dynamic = 'force-dynamic';
import HolidayPublicPage from '@/components/content/HolidayPublicPage';

export default async function Page() {
  return <HolidayPublicPage holiday="christmas" />;
}
