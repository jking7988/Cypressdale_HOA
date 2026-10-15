'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import HubForm from './HubForm';
import { removeAccount } from '@/lib/member-hub/actions';

export default function RemoveAccount({ id, name, self = false }: { id: string; name: string; self?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  return <>
    <button type="button" className={self ? 'hub-button hub-danger' : 'hub-icon hub-danger'} onClick={() => setOpen(true)}
      aria-label={self ? 'Delete My Account' : `Remove ${name}`} title={self ? 'Delete My Account' : 'Remove account'}>
      <Trash2 size={17} />{self && 'Delete My Account'}
    </button>
    <dialog ref={dialog} className="hub-dialog" onClose={() => setOpen(false)}>
      <div className="hub-dialog-heading"><h2>{self ? 'Delete Your Account' : 'Remove Account'}</h2>
        <button type="button" className="hub-icon" aria-label="Close" title="Close" onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      {open && <><p>{self ? 'Your' : `${name}'s`} account and personal details will be removed. Comments and RSVPs will remain under User Cleared.</p>
        <HubForm action={async (form) => { const result = await removeAccount(form); if (result.success) setOpen(false); return result; }}
          fields={[{ name: 'id', type: 'hidden', label: '', value: id }, { name: 'password', label: 'Your Current Password', type: 'password', autoComplete: 'current-password' }]}
          button={self ? 'Delete My Account' : 'Remove Account'}>
          <label className="hub-check"><input type="checkbox" required />I understand this cannot be undone.</label>
          <label className="hub-check"><input type="checkbox" name="unsubscribe_newsletter" />Also unsubscribe from the newsletter.</label>
        </HubForm>
      </>}
    </dialog>
  </>;
}
