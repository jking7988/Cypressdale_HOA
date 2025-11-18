// app/admin/trash-reminders/page.tsx
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TrashReminder = {
  email: string;
  active: boolean;
  created_at: string | null;
};

export default async function TrashRemindersAdminPage() {
  const { data, error } = await supabase
    .from('trash_reminders')
    .select('email, active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading trash_reminders:', error);
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Trash Reminder Signups
        </h2>
        <p className="text-sm text-red-700">
          Unable to load signups. Check the server logs for details.
        </p>
      </div>
    );
  }

  const rows: TrashReminder[] = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Trash Reminder Signups
          </h2>
          <p className="text-xs text-slate-600">
            Showing all rows from the <code>trash_reminders</code> table.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">No signups found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                  Email
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const createdLabel = row.created_at
                  ? new Date(row.created_at).toLocaleString()
                  : '—';

                return (
                  <tr
                    key={`${row.email}-${row.created_at ?? ''}`}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-3 py-2 font-mono text-xs md:text-sm">
                      {row.email}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.active
                            ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200'
                            : 'inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200'
                        }
                      >
                        {row.active ? 'Active' : 'Unsubscribed'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {createdLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
