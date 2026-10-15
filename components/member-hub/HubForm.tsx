'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import type { HubActionResult } from '@/lib/member-hub/forms';
import SuccessMessage from './SuccessMessage';

export type HubField = { name: string; label: string; type?: string; autoComplete?: string; value?: string; minLength?: number; maxLength?: number };

export default function HubForm({ action, fields, button, disabled = false, children }: {
  action: (form: FormData) => Promise<HubActionResult>; fields: HubField[]; button: string; disabled?: boolean; children?: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HubActionResult>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult({});
    const form = new FormData(event.currentTarget);
    try {
      const response = await action(form);
      setResult(response);
      if (response.redirect) { router.replace(response.redirect); router.refresh(); }
      else if (response.success) router.refresh();
    } catch { setResult({ error: 'Unable to complete your request. Please try again.' }); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="hub-form" aria-busy={busy}>
    {fields.map(field => field.type === 'hidden'
      ? <input key={field.name} type="hidden" name={field.name} value={field.value} />
      : <div className="hub-field" key={field.name}>
        <label htmlFor={field.name}>{field.label}</label>
        <div className="hub-input-wrap">
          <input id={field.name} name={field.name} type={visible[field.name] ? 'text' : field.type || 'text'}
            autoComplete={field.autoComplete} defaultValue={field.value} minLength={field.minLength}
            maxLength={field.maxLength || (field.type === 'password' ? 128 : undefined)} required disabled={disabled || busy}
            className={field.type === 'password' ? 'hub-password' : ''} />
          {field.type === 'password' && <button type="button" className="hub-eye" title={visible[field.name] ? 'Hide password' : 'Show password'}
            aria-label={visible[field.name] ? 'Hide password' : 'Show password'} onClick={() => setVisible(prev => ({ ...prev, [field.name]: !prev[field.name] }))}>
            {visible[field.name] ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>}
        </div>
      </div>)}
    {result.error && <p className="hub-message hub-error" role="alert">{result.error}</p>}
    <SuccessMessage notice={result} />
    {children}
    <button className="hub-button" type="submit" disabled={disabled || busy}>
      {busy && <LoaderCircle size={17} className="animate-spin" />}{busy ? 'Please wait...' : button}
    </button>
  </form>;
}

export function SignOutButton({ action }: { action: () => Promise<HubActionResult> }) {
  return <HubForm action={action} fields={[]} button="Sign Out" />;
}
