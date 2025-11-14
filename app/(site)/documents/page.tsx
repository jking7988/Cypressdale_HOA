// app/documents/page.tsx
export const dynamic = 'force-dynamic';

import {client} from '@/lib/sanity.client';
import {documentsQuery} from '@/lib/queries';

type DocFile = {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  fileUrl: string;
};

export default async function DocumentsPage() {
  const docs = await client.fetch<DocFile[]>(documentsQuery);

  // group docs by category (folder)
  const grouped: Record<string, DocFile[]> = docs.reduce(
    (acc, doc) => {
      const key = doc.category || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    },
    {} as Record<string, DocFile[]>,
  );

  // sort categories alphabetically so “Governing Documents” etc are stable
  const categories = Object.entries(grouped).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <h1 className="h1">Documents</h1>

      <section className="mt-2">
        <details className="group rounded-2xl border border-slate-800 bg-slate-950/95 text-slate-100 shadow-lg">
          <summary className="cursor-pointer flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex items-center gap-2">
              <span className="text-xl">🕵️‍♂️</span>
              <span className="font-semibold tracking-tight">
                The Case of the Missing Category
              </span>
            </span>

            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <span className="group-open:hidden flex items-center gap-1">
                🔍 Open case file
              </span>
              <span className="hidden group-open:flex items-center gap-1">
                🗃️ Close case file
              </span>
            </span>
          </summary>

          <div className="border-t border-slate-800 px-4 py-4 space-y-4 text-sm leading-relaxed">
            <p className="flex items-start gap-2">
              🌒
              <span>
                In the quiet digital neighborhood of Cypressdale, the Documents page had a simple
                job: file everything neatly into folders like <em>Governing Documents</em> and
                <em> Neighborhood Plat Maps</em>. For years, the system worked… until one night
                every file vanished into a single, gloomy folder named <strong>“Other.”</strong>
              </span>
            </p>

            <p className="flex items-start gap-2">
              🗂️
              <span>
                Homeowners were confused. The HOA board was suspicious. The Documents page just
                stared back, pretending nothing was wrong. Somewhere in the shadows of the code,
                a tiny bug was having a good laugh.
              </span>
            </p>

            <p className="flex items-start gap-2">
              🕵️‍♀️
              <span>
                The developer started digging. The database swore it had
                <code className="mx-1">category: "Neighborhood Plat Maps"</code>. The schema
                insisted there was a <code>category</code> field. The UI promised it was
                grouping by <code>doc.category || "Other"</code>. On paper, everyone was
                innocent—yet every document still ended up in “Other.”
              </span>
            </p>

            <p className="flex items-start gap-2">
              🔍
              <span>
                Then the spotlight hit the query. Buried in the middle of it was the real
                culprit:
                <code className="mx-1">"category": section</code>. A ghost field from an old
                version of the schema, always returning <code>null</code>, quietly shoving
                every file into the catch-all folder while the UI shrugged and complied.
              </span>
            </p>

            <p className="flex items-start gap-2">
              💡
              <span>
                The fix was almost embarrassingly small—swap the imposter for the real thing:
                <code className="mx-1">category,</code>. With that single change, the folders
                snapped back into place, names restored, order returned. “Other” went back to
                being a polite fallback instead of a black hole.
              </span>
            </p>

            <p className="flex items-start gap-2">
              📁
              <span>
                And that&apos;s how the Cypressdale HOA Documents page solved its own little
                mystery, escaped a life of misfiled data, and retired the case under one final
                note in the log: <em>“What a bunch of malorky.”</em>
              </span>
            </p>
          </div>
        </details>
      </section>


      {categories.length === 0 && (
        <p className="muted">No documents available yet.</p>
      )}

      <ul className="space-y-4">
        {categories.map(([category, files]) => (
          <li key={category} className="space-y-2">
            {/* Folder-style collapsible – closed by default */}
            <details className="group border border-brand-100 rounded-xl bg-white/70 shadow-sm">
              <summary className="cursor-pointer flex items-center gap-2 px-4 py-3">
                <span className="text-lg">📁</span>
                <span className="font-semibold text-brand-800">
                  {category}
                </span>
              </summary>

              {/* Files inside this “folder” */}
              <div className="border-t border-brand-100 px-4 py-3 space-y-2">
                {files.map((file) => (
                  <a
                    key={file._id}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="card flex items-center gap-3"
                  >
                    <span className="text-base">📄</span>
                    <div>
                      <div className="text-sm font-medium text-brand-900">
                        {file.title}
                      </div>
                      {file.description && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {file.description}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
