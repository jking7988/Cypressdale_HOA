// src/components/ContactCards.tsx
import { Mail } from 'lucide-react';
import { CONTACTS } from '@/lib/contact';

export function ContactCards() {
  const entries = Object.values(CONTACTS);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map((c) => (
        <div
          key={c.email}
          className="rounded-2xl bg-white/90 border border-emerald-50 shadow-md px-4 py-4"
        >
          <h3 className="text-sm font-semibold text-emerald-900 mb-1">
            {c.label}
          </h3>
          {c.description && (
            <p className="text-xs text-gray-600 mb-2">{c.description}</p>
          )}
          <a
            href={`mailto:${c.email}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline"
          >
            <Mail className="h-3 w-3" />
            <span>{c.email}</span>
          </a>
        </div>
      ))}
    </div>
  );
}
