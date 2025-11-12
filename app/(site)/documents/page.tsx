import { client } from '@/lib/sanity.client';
import { documentsQuery } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const docs = await client.fetch(documentsQuery);
  return (
    <div className="space-y-6">
      <h1 className="h1">Documents</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {docs.map((d: any) => (
          <a key={d._id} href={d.fileUrl} target="_blank" className="card">
            <h2 className="text-lg font-semibold">{d.title}</h2>
            {d.category && <p className="muted">{d.category}</p>}
            {d.description && <p className="mt-2">{d.description}</p>}
          </a>
        ))}
      </div>
    </div>
  );
}
