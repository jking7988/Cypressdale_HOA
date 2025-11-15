// app/documents/page.tsx
export const dynamic = 'force-dynamic';

import { client } from '@/lib/sanity.client';
import { documentsQuery } from '@/lib/queries';
import { FolderClosed, FolderOpen, FileText, ExternalLink } from 'lucide-react';

type DocFile = {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  fileUrl: string;
  uploadedAt?: string; // from coalesce(uploadedAt, _updatedAt)
  fileName?: string;   // original filename
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

  // sort categories alphabetically so folder order is stable
  const categories = Object.entries(grouped).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      {/* Big “folder” wrapper */}
      <div className="relative max-w-5xl mx-auto">
        {/* Folder tab */}
        <div className="absolute -top-6 left-4 sm:left-8">
          <div className="inline-flex items-center rounded-t-2xl rounded-b-lg bg-amber-100 border border-amber-200 px-4 py-1.5 shadow-sm">
            <span className="text-xs font-semibold tracking-wide text-amber-900 uppercase">
              Documents
            </span>
          </div>
        </div>

        {/* Folder body */}
        <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100/70 shadow-[0_18px_40px_rgba(15,23,42,0.12)] px-4 py-6 sm:px-8 sm:py-8">
          <header className="space-y-1 mb-6">
            <h1 className="h1 text-brand-900">Community Documents</h1>
            <p className="muted max-w-2xl text-brand-800/80">
              View downloadable HOA documents such as plat maps, pool
              information, ACC forms, and more.
            </p>
          </header>

          {categories.length === 0 && (
            <p className="muted">No documents available yet.</p>
          )}

          {categories.length > 0 && (
            <ul className="space-y-4">
              {categories.map(([category, files]) => (
                <li key={category} className="space-y-2">
                  {/* Subfolder-style collapsible */}
                  <details className="group border border-amber-200/80 rounded-2xl bg-amber-50/70 shadow-sm">
                    <summary className="cursor-pointer flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 border border-amber-200/80">
                          <FolderClosed className="w-4 h-4 text-amber-800 group-open:hidden" />
                          <FolderOpen className="w-4 h-4 text-amber-800 hidden group-open:inline-block" />
                        </span>
                        <span className="font-semibold text-amber-900">
                          {category}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200/80">
                        {files.length} file{files.length !== 1 ? 's' : ''}
                      </span>
                    </summary>

                    {/* Files inside this “folder” */}
                    <div className="border-t border-amber-200/80 px-4 py-3 sm:px-5 sm:py-4 space-y-2">
                      {files.map((file) => {
                        const updatedLabel = file.uploadedAt
                          ? new Date(file.uploadedAt).toLocaleDateString(
                              undefined,
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              },
                            )
                          : null;

                        const ext =
                          file.fileName?.split('.').pop()?.toUpperCase() ||
                          'FILE';

                        return (
                          <a
                            key={file._id}
                            href={file.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="card flex items-start gap-3 hover:border-amber-300 hover:bg-amber-50 transition"
                          >
                            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/80">
                              <FileText className="w-4 h-4 text-amber-900" />
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-amber-950">
                                  {file.title}
                                </div>
                                <ExternalLink className="w-3 h-3 text-amber-700" />
                              </div>

                              {file.description && (
                                <p className="text-xs text-amber-900/80 mt-0.5">
                                  {file.description}
                                </p>
                              )}

                              {(ext || updatedLabel) && (
                                <p className="text-[11px] text-amber-900/70 mt-0.5">
                                  <span className="inline-flex items-center gap-1">
                                    <span className="px-1.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-[10px] uppercase tracking-wide">
                                      {ext}
                                    </span>
                                    {updatedLabel && (
                                      <span>· Updated {updatedLabel}</span>
                                    )}
                                  </span>
                                </p>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}

          {/* Spectrum / management portal note – looks like a note inside the folder */}
          <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3 text-sm text-amber-950 flex gap-3 items-start shadow-inner">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 border border-amber-300 text-amber-900 text-sm mt-0.5">
              i
            </span>
            <div>
              <p className="font-semibold">Additional documents</p>
              <p className="mt-1">
                Not all community documents are listed on this page. For more
                documents, please log in to the neighborhood management
                portal:{' '}
                <a
                  href="https://spectrum.cincwebaxis.com/account/loginmodernthemes"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline decoration-amber-900/60 underline-offset-2"
                >
                  Spectrum Portal
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
