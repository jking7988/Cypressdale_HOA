import { loadHubPage } from '@/lib/member-hub/pages';
import { programs, type Program } from '@/lib/member-hub/programs';
import type { ContentRecord, MediaAsset } from '@/lib/member-hub/content';
import ProgramWorkspace from './ProgramWorkspace';
import { redirect } from 'next/navigation';
import { holidayPages, winnerHoliday, type Holiday } from '@/lib/member-hub/holidays';

export default async function ProgramAdminPage({ program, selected, holiday = 'christmas' }: { program: Program; selected?: string; holiday?: Holiday }) {
  const { account, error } = await loadHubPage('admin');
  if (!account) return <p className="hub-message">{error}</p>;
  const info = program === 'holiday' ? { ...programs.holiday, ...holidayPages[holiday] } : programs[program];
  const [page, winners, assets] = await Promise.all([
    account.client.from('hoa_content').select('*').eq('id', info.id).single(),
    account.client.from('hoa_content').select('*').eq('kind', info.kind).order('updated_at', { ascending: false }),
    account.client.from('hoa_assets').select('id, original_filename, mime_type, object_path, library').like('mime_type', 'image/%').order('created_at', { ascending: false }),
  ]);
  if (page.error || winners.error || assets.error) return <p className="hub-message">Unable to load program. Check local migrations.</p>;
  const selectedWinner = winners.data.find(row => row.id === selected);
  if (program === 'holiday' && selectedWinner && winnerHoliday(selectedWinner.settings.holiday) !== holiday) redirect(`${holidayPages[winnerHoliday(selectedWinner.settings.holiday)].adminPath}?winner=${encodeURIComponent(selectedWinner.id)}`);
  return <ProgramWorkspace key={`${program}-${holiday}-${selected || ''}`} program={program} holiday={holiday} page={page.data as ContentRecord} initial={winners.data as ContentRecord[]} originalAssets={assets.data as MediaAsset[]} selected={selected} />;
}
