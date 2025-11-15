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
      <header className="space-y-2">
        <h1 className="h1">Documents</h1>
        <p className="muted max-w-2xl">
          View downloadable HOA documents such as plat maps, pool information,
          ACC forms, and more.
        </p>
      </header>

      {categories.length === 0 && (
        <p className="muted">No documents available yet.</p>
      )}

      {categories.length > 0 && (
        <ul className="space-y-4">
          {categories.map(([category, files]) => (
            <li key={category} className="space-y-2">
              {/* Folder-style collapsible – closed by default */}
              <details className="group border border-brand-100 rounded-xl bg-white/80 shadow-sm">
                <summary className="cursor-pointer flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 border border-brand-100">
                      <FolderClosed className="w-4 h-4 text-brand-700 group-open:hidden" />
                      <FolderOpen className="w-4 h-4 text-brand-700 hidden group-open:inline-block" />
                    </span>
                    <span className="font-semibold text-brand-800">
                      {category}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                    {files.length} file{files.length !== 1 ? 's' : ''}
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
                      className="card flex items-start gap-3 hover:border-brand-200 hover:bg-brand-50/60 transition"
                    >
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 border border-brand-100">
                        <FileText className="w-4 h-4 text-brand-700" />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-brand-900">
                            {file.title}
                          </div>
                          <ExternalLink className="w-3 h-3 text-brand-500" />
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
      )}

      {/* Spectrum / management portal note */}
      <section className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-3 items-start">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-sm mt-0.5">
          i
        </span>
        <div>
          <p className="font-semibold">Additional documents</p>
          <p className="mt-1">
            Not all community documents are listed on this page. For more
            documents, please log in to the neighborhood management portal:{' '}
            <a
              href="https://spectrum.cincwebaxis.com/account/loginmodernthemes"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              Spectrum Portal
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
