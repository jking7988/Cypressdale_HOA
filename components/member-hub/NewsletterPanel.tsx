'use client';
import { useState } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import SuccessMessage from './SuccessMessage';
type Preview = { subject: string; text: string; html: string; subscribers: number; transport: string; items: { id: string; kind: string; title: string }[] };
export default function NewsletterPanel({ initial }: { initial: Preview }) {
  const [preview,setPreview] = useState(initial), [busy,setBusy] = useState(false), [message,setMessage] = useState<{ success?: string; error?: string }>({});
  async function refresh() {
    setBusy(true); setMessage({});
    try { const response = await fetch('/api/newsletter/preview',{cache:'no-store'}); const data = await response.json();
      if (!response.ok) throw new Error(data.error); setPreview(data);
    } catch(error) { setMessage({ error: error instanceof Error ? error.message : 'Unable to refresh.' }); }
    finally { setBusy(false); }
  }
  async function send() {
    if (!window.confirm(`Send this newsletter to ${preview.subscribers} confirmed subscribers${preview.transport === 'mailpit' ? ' in Mailpit' : ''}?`)) return;
    setBusy(true); setMessage({});
    try { const response = await fetch('/api/newsletter/send',{method:'POST'}); const data = await response.json();
      if (!response.ok) throw new Error(data.error || `${data.failed ?? 0} deliveries failed. Retry to process unsent deliveries.`);
      setMessage({ success: data.reason ? `No email sent: ${data.reason}.` : `${data.sent} sent; ${data.pending} pending. ${data.transport === 'mailpit' ? 'Captured in Mailpit.' : ''}` });
    } catch(error) { setMessage({ error: error instanceof Error ? error.message : 'Unable to send.' }); }
    finally { setBusy(false); }
  }
  return <>
    <div className="hub-toolbar"><span>{preview.subscribers} confirmed subscribers</span><span>{preview.transport === 'mailpit' ? 'Mailpit' : preview.transport === 'disabled' ? 'Delivery Disabled' : 'Staging'}</span>
      <button className="hub-icon" title="Refresh preview" aria-label="Refresh preview" disabled={busy} onClick={refresh}><RefreshCw size={18}/></button>
      <button className="hub-button" disabled={busy || !preview.items.length || !preview.subscribers || preview.transport === 'disabled'} onClick={send}><Send size={17}/>{preview.transport === 'mailpit' ? 'Send to Mailpit' : 'Send Newsletter'}</button></div>
    <SuccessMessage notice={message} />
    {message.error && <p className="hub-message hub-error" role="alert">{message.error}</p>}
    <section className="hub-section"><h2>{preview.subject}</h2>{preview.items.length
      ? <iframe title="Newsletter Preview" srcDoc={preview.html} sandbox="" style={{width:'100%',minHeight:480,border:'1px solid #d6e3de',borderRadius:6}} />
      : <p className="hub-empty">No news or upcoming events.</p>}</section>
  </>;
}
