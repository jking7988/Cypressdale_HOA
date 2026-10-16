import { newsletterPreview } from '@/lib/newsletter/send';
import { createHubStorageClient } from '@/lib/member-hub/server';
import { loadHubPage } from '@/lib/member-hub/pages';
import NewsletterPanel from '@/components/member-hub/NewsletterPanel';
import { newsletterTables } from '@/lib/newsletter/tables';
export const metadata = { title: 'Newsletter' };
export default async function NewsletterPage() {
  const {account,error} = await loadHubPage('admin');
  if (!account) return <p className="hub-message">{error}</p>;
  const preview = await newsletterPreview();
  const assets = await account.client.from('hoa_assets').select('id,original_filename,mime_type,object_path,library')
    .eq('library', 'files').in('mime_type', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']).order('created_at', { ascending: false }).limit(1000);
  if (assets.error) throw new Error('Unable to load newsletter background images.');
  const runs = await createHubStorageClient().from(newsletterTables().runs).select('id,created_at,sent_at,transport,payload').order('created_at',{ascending:false}).limit(10);
  return <><div className="hub-page-heading"><h1>Newsletter</h1></div><NewsletterPanel initial={preview} originalAssets={assets.data ?? []}/>
    <section className="hub-section"><h2>Recent Campaigns</h2><ul className="hub-content-list">{(runs.data ?? []).map(run => <li key={run.id}><span>{new Date(run.created_at).toLocaleString('en-US',{timeZone:'America/Chicago'})}</span><span>{run.transport}</span>{run.payload?.manualResend && <span>Manual Resend</span>}<span>{run.sent_at ? 'Completed' : 'Pending / Retry'}</span></li>)}</ul></section></>;
}
