export const dynamic = 'force-dynamic';
import { getPublicContent, getPublishedContent } from '@/lib/member-hub/public-content';
import { programs, programSettings, type YardSettings } from '@/lib/member-hub/programs';
import YardProgramPage, { type YardWinner } from '@/components/content/YardProgramPage';

export default async function Page() {
  const [winners, page] = await Promise.all([
    getPublicContent<YardWinner>('yardWinner'),
    getPublishedContent<{ _id: string; programSettings?: unknown }>('page', programs.yard.id),
  ]);
  return <YardProgramPage winners={winners} config={programSettings('yard', page?.programSettings) as YardSettings} />;
}

