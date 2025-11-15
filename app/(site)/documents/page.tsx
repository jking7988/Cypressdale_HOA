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
            <section className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-3 items-start">
        <span className="text-lg pt-0.5">🔐</span>
        <div>
            <p className="font-semibold">
            Additional documents
            </p>
            <p className="mt-1">
            Not all community documents are listed on this page. For more
            documents, please log in to
            the neighborhood management portal:
            {' '}
            <a
                href="https://spectrum.cincwebaxis.com/account/loginmodernthemes"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
            >
                Spectrum Portal
            </a>.
            </p>
        </div>
        </section>
      </ul>
    </div>
  );
}

        