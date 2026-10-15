import { getPublicContent, getPublishedContent } from '@/lib/member-hub/public-content';
import { programSettings, type HolidaySettings } from '@/lib/member-hub/programs';
import { holidayPages, holidayDefaults, type Holiday } from '@/lib/member-hub/holidays';
import HolidayProgramPage, { type HolidayWinner } from './HolidayProgramPage';

export default async function HolidayPublicPage({ holiday }: { holiday: Holiday }) {
  const [winners, page] = await Promise.all([
    getPublicContent<HolidayWinner>('holidayWinner'),
    getPublishedContent<{ _id: string; programSettings?: unknown }>('page', holidayPages[holiday].id),
  ]);
  return <HolidayProgramPage holiday={holiday} winners={winners} config={programSettings('holiday', page?.programSettings || holidayDefaults(holiday)) as HolidaySettings} />;
}
