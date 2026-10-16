'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, RefreshCw, Save, RotateCw } from 'lucide-react';
import equal from 'fast-deep-equal';
import SuccessMessage from './SuccessMessage';
import NewsletterCustomization from './NewsletterCustomization';
import { renderNewsletter, selectNewsletterItems, newsletterSettingsSchema, type NewsletterItem, type NewsletterSettings } from '@/lib/newsletter/template';
import { saveNewsletterSettings } from '@/lib/newsletter/settings-actions';
import { uploadMedia } from '@/lib/member-hub/content-actions';
import type { MediaAsset } from '@/lib/member-hub/content';
type Preview = { subject: string; text: string; html: string; subscribers: number; transport: string; live: boolean;
  items: NewsletterItem[]; availableItems: NewsletterItem[]; settings: NewsletterSettings; settingsVersion: number; origin: string };
export default function NewsletterPanel({ initial, originalAssets = [] }: { initial: Preview; originalAssets?: MediaAsset[] }) {
  const router = useRouter();
  const [preview,setPreview] = useState(initial), [busy,setBusy] = useState(false), [message,setMessage] = useState<{ success?: string; error?: string }>({});
  const [settings, setSettings] = useState(initial.settings);
  const [assets, setAssets] = useState(originalAssets);
  const [resendRequestId, setResendRequestId] = useState<string | null>(null);
  const dirty = !equal(settings, preview.settings);
  const parsed = newsletterSettingsSchema.safeParse(settings);
  const currentSettings = parsed.success ? parsed.data : preview.settings;
  const items = selectNewsletterItems(preview.availableItems, currentSettings);
  const rendered = renderNewsletter(items, preview.origin, `${preview.origin}/api/newsletter/unsubscribe`, currentSettings, { appearance: 'light' });
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  async function refresh() {
    if (dirty && !window.confirm('Discard unsaved newsletter customization changes?')) return;
    setBusy(true); setMessage({});
    try { const response = await fetch('/api/newsletter/preview',{cache:'no-store'}); const data = await response.json();
      if (!response.ok) throw new Error(data.error); setPreview(data); setSettings(data.settings);
    } catch(error) { setMessage({ error: error instanceof Error ? error.message : 'Unable to refresh.' }); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setMessage({});
    try {
      const result = await saveNewsletterSettings(settings, preview.settingsVersion);
      if (result.error || !result.settings) throw new Error(result.error || 'Unable to save customization.');
      setSettings(result.settings); setPreview(previous => ({ ...previous, settings: result.settings!, settingsVersion: result.version! }));
      setMessage({ success: 'Newsletter customization saved.' });
    } catch (error) { setMessage({ error: error instanceof Error ? error.message : 'Unable to save customization.' }); }
    finally { setBusy(false); }
  }
  async function uploadBackground(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setMessage({ error: 'Choose a JPEG, PNG, GIF, or WebP image file. PDFs cannot be used as email backgrounds.' }); return;
    }
    setBusy(true); setMessage({});
    try {
      const form = new FormData(); form.set('file', file);
      const result = await uploadMedia(form);
      if (result.error || !result.asset) throw new Error(result.error || 'Unable to upload the background image.');
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(result.asset.mime_type)) throw new Error('Choose an image file, not a document.');
      const asset = result.asset;
      setAssets(previous => [asset, ...previous]);
      setSettings(previous => ({ ...previous, backgroundImage: { _ref: asset.id } }));
      setMessage({ success: 'Background uploaded to Files.' });
    } catch (error) { setMessage({ error: error instanceof Error ? error.message : 'Unable to upload the background image.' }); }
    finally { setBusy(false); }
  }
  async function send(resend = false) {
    if (dirty || !parsed.success) { setMessage({ error: 'Save newsletter customization before sending.' }); return; }
    const audience = `${preview.subscribers} confirmed subscribers${preview.transport === 'mailpit' ? ' in Mailpit' : preview.live ? '' : ' on the test allowlist only'}`;
    const confirmation = resend ? resendRequestId ? `Retry this resend to ${audience}? Only unsent deliveries in this request will be processed.`
      : `Override the once-per-day limit and send this newsletter again to ${audience}? People who already received it may receive another copy.`
      : `Send this newsletter to ${audience}?`;
    if (!window.confirm(confirmation)) return;
    const requestId = resend ? resendRequestId || crypto.randomUUID() : null;
    if (requestId) setResendRequestId(requestId);
    setBusy(true); setMessage({});
    try { const response = await fetch('/api/newsletter/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settingsVersion:preview.settingsVersion,
      ...(requestId ? { overrideDailyLimit: true, resendRequestId: requestId } : {})})}); const data = await response.json();
      if (requestId && response.status === 409) setResendRequestId(null);
      if (!response.ok) throw new Error(data.error || `${data.failed ?? 0} deliveries failed. Retry to process unsent deliveries.`);
      if (requestId && !data.pending) setResendRequestId(null);
      const reasons: Record<string, string> = { 'already-sent-today': 'No email sent: this newsletter was already sent today. Use Send Again to override the daily limit.',
        'already-sent-request': 'This resend request was already completed. No duplicate email sent.' };
      setMessage({ success: data.reason ? reasons[data.reason] || `No email sent: ${data.reason}.` : `${data.sent} sent; ${data.pending} pending. ${data.transport === 'mailpit' ? 'Captured in Mailpit.' : ''}` });
      router.refresh();
    } catch(error) { setMessage({ error: error instanceof Error ? error.message : 'Unable to send.' }); }
    finally { setBusy(false); }
  }
  return <>
    <div className="hub-toolbar"><span>{preview.subscribers} confirmed subscribers</span><span>{preview.transport === 'mailpit' ? 'Mailpit' : preview.transport === 'disabled' ? 'Delivery Disabled' : preview.live ? 'Live Delivery' : 'Test Recipients Only'}</span>
      <button className="hub-icon" title="Refresh preview" aria-label="Refresh preview" disabled={busy} onClick={refresh}><RefreshCw size={18}/></button>
      <span className="hub-editor-save-state" aria-live="polite">{dirty ? 'Unsaved changes' : 'Saved'}</span>
      <button type="button" className="hub-button hub-secondary" disabled={busy || !dirty || !parsed.success} onClick={save}><Save size={17} />Save Customization</button>
      <button type="button" className="hub-button" disabled={busy || !!resendRequestId || dirty || !parsed.success || !items.length || !preview.subscribers || preview.transport === 'disabled'} onClick={() => send()}><Send size={17}/>{preview.transport === 'mailpit' ? 'Send to Mailpit' : 'Send Newsletter'}</button>
      <button type="button" className="hub-button hub-secondary" disabled={busy || dirty || !parsed.success || !items.length || !preview.subscribers || preview.transport === 'disabled'} onClick={() => send(true)}><RotateCw size={17}/>{resendRequestId ? 'Retry Resend' : 'Send Again'}</button></div>
    <SuccessMessage notice={message} />
    {message.error && <p className="hub-message hub-error" role="alert">{message.error}</p>}
    {!parsed.success && <p className="hub-message hub-error" role="alert">{parsed.error.issues[0]?.message}</p>}
    <div className="hub-newsletter-workspace"><NewsletterCustomization value={settings} onChange={setSettings} disabled={busy} assets={assets} onUploadBackground={uploadBackground} />
      <section className="hub-newsletter-preview" aria-label="Newsletter email preview"><h2>Email Preview</h2><p className="hub-newsletter-subject">{rendered.subject}</p>
        {!items.length && <p className="hub-empty">No news or upcoming events selected.</p>}
        <iframe title="Newsletter Preview" srcDoc={rendered.html} sandbox="" />
      </section></div>
  </>;
}
