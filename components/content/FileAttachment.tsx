import { Download, ExternalLink } from 'lucide-react';
import PdfPreview from './PdfPreview';

export default function FileAttachment({ url, mime, name }: { url?: string; mime?: string; name?: string }) {
  if (!url) return null;
  const label = name || 'Community flyer';
  const viewUrl = `${url}?view=1`;
  const linkClass = 'inline-flex items-center gap-2 rounded border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900';
  return <div className="min-w-0 space-y-3" aria-label="File attachment">
    {mime?.startsWith('image/') && <img src={url} alt={label} className="block h-auto w-full max-w-full object-contain" />}
    {mime === 'application/pdf' && <PdfPreview url={viewUrl} name={label} />}
    <div className="flex flex-wrap gap-2">
      <a href={viewUrl} target="_blank" rel="noopener noreferrer" className={linkClass}><ExternalLink size={16} />Open file</a>
      <a href={url} download={name || true} className={linkClass}><Download size={16} />Download file</a>
    </div>
  </div>;
}
