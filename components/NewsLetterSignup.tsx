'use client';

import { FormEvent, useState } from 'react';

type ToastKind = 'success' | 'error';

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

export function NewsLetterSignup() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [status, setStatus] =
    useState<'idle' | 'loading'>('idle');

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, street }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(
          'error',
          data.error || 'Something went wrong. Please try again.'
        );
        return;
      }

      // Success: show toast, clear email
      addToast(
        'success',
        data.message ||
          'Check your email to confirm your Cypressdale newsletter subscription.'
      );
      setEmail('');
    } catch (err) {
      console.error(err);
      addToast('error', 'Network error. Please try again.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <>
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`max-w-sm rounded-md border px-3 py-2 text-xs md:text-sm shadow-lg ${
                toast.kind === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-emerald-900/20'
                  : 'border-red-300 bg-red-50 text-red-900 shadow-red-900/20'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <section className="card border border-emerald-200 bg-white backdrop-blur-sm space-y-3 shadow-md shadow-emerald-900/10">
        <h2 className="text-base md:text-lg font-semibold text-emerald-950">
          Cypressdale Email Newsletter
        </h2>
        <p className="text-xs md:text-sm text-emerald-900/85">
          Sign up to receive occasional updates about neighborhood news, events,
          and important notices in your inbox.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-emerald-900/90">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-sm text-emerald-900 shadow-inner shadow-emerald-900/5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-emerald-900/90">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-sm text-emerald-900 shadow-inner shadow-emerald-900/5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Jane Smith"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-emerald-900/90">
              Street (optional)
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-sm text-emerald-900 shadow-inner shadow-emerald-900/5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g., Cypressdale Dr"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex w-full items-center justify-center rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-50 shadow-md shadow-emerald-900/20 hover:bg-emerald-800 disabled:opacity-60"
          >
            {status === 'loading' ? 'Signing you up…' : 'Sign me up'}
          </button>
        </form>
      </section>
    </>
  );
}
