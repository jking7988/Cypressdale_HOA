import {client} from '@/lib/sanity.client';
import {documentsWithFoldersQuery} from '@/lib/queries';

export const dynamic = 'force-dynamic';

type FolderDoc = {
  _id: string;
  title: string;
  parentId?: string;
};

type FileDoc = {
  _id: string;
  title: string;
  category?: string;
  description?: string;
  fileUrl: string;
  folderId?: string;
};

type FolderNode = {
  id: string;
  title: string;
  children: FolderNode[];
  files: FileDoc[];
};

function buildFolderTree(folders: FolderDoc[], files: FileDoc[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>();

  // Init folder nodes
  folders.forEach((f) => {
    nodes.set(f._id, {
      id: f._id,
      title: f.title,
      children: [],
      files: [],
    });
  });

  // Attach files to their folder nodes
  files.forEach((file) => {
    if (!file.folderId) return;
    const node = nodes.get(file.folderId);
    if (node) {
      node.files.push(file);
    }
  });

  // Build hierarchy
  const roots: FolderNode[] = [];
  folders.forEach((f) => {
    const node = nodes.get(f._id)!;
    if (f.parentId && nodes.has(f.parentId)) {
      nodes.get(f.parentId)!.children.push(node);
    } else {
      // no parent → top-level folder
      roots.push(node);
    }
  });

  // Optional: sort folders & files alphabetically
  const sortNode = (node: FolderNode) => {
    node.children.sort((a, b) => a.title.localeCompare(b.title));
    node.files.sort((a, b) => a.title.localeCompare(b.title));
    node.children.forEach(sortNode);
  };
  roots.forEach(sortNode);

  return roots;
}

function FolderView({node}: {node: FolderNode}) {
  const hasChildren = node.children.length > 0 || node.files.length > 0;

  return (
    <li className="space-y-2">
      <details open>
        <summary className="cursor-pointer font-semibold flex items-center gap-2">
          <span>📁</span>
          <span>{node.title}</span>
        </summary>

        {hasChildren ? (
          <div className="ml-5 mt-2 space-y-4">
            {/* Files directly in this folder */}
            {node.files.length > 0 && (
              <ul className="space-y-2">
                {node.files.map((file) => (
                  <li key={file._id}>
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      className="card block"
                      rel="noreferrer"
                    >
                      <div className="flex items-center gap-2">
                        <span>📄</span>
                        <div>
                          <h3 className="text-sm font-medium">{file.title}</h3>
                          {file.category && (
                            <p className="muted text-xs">{file.category}</p>
                          )}
                          {file.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {file.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {/* Subfolders */}
            {node.children.length > 0 && (
              <ul className="space-y-2">
                {node.children.map((child) => (
                  <FolderView key={child.id} node={child} />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="ml-5 mt-2 text-xs text-muted-foreground">Empty</p>
        )}
      </details>
    </li>
  );
}

export default async function DocumentsPage() {
  const {folders, files} = await client.fetch<{
    folders: FolderDoc[];
    files: FileDoc[];
  }>(documentsWithFoldersQuery);

  const tree = buildFolderTree(folders, files);

  return (
    <div className="space-y-6">
      <h1 className="h1">Documents</h1>

      {tree.length === 0 ? (
        <p className="muted">No documents available yet.</p>
      ) : (
        <ul className="space-y-4">
          {tree.map((folder) => (
            <FolderView key={folder.id} node={folder} />
          ))}
        </ul>
      )}
    </div>
  );
}
