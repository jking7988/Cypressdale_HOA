// deskStructure.ts
import type {StructureResolver} from 'sanity/structure'

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      // === Document Library ===
      S.listItem()
        .title('Document Library')
        .child(
          // List of all folders
          S.documentTypeList('documentFolder')
            .title('Folders')
            .child((folderId) =>
              S.list()
                .title('Folder contents')
                .items([
                  // --- Subfolders ---
                  S.listItem()
                    .title('Subfolders')
                    .child(
                      S.documentList()
                        .title('Subfolders')
                        .filter(
                          '_type == "documentFolder" && parent._ref == $folderId'
                        )
                        .params({folderId})
                    ),

                  // --- Files in this folder ---
                  S.listItem()
                    .title('Files')
                    .child(
                      S.documentList()
                        .title('Files in folder')
                        .filter(
                          '_type == "documentFile" && folder._ref == $folderId'
                        )
                        .params({folderId})
                    ),
                ])
            )
        ),

      // Optional: quick access to all files
      S.listItem()
        .title('All Files')
        .child(S.documentTypeList('documentFile').title('All Files')),

      S.divider(),

      // All other document types (everything except folder + file)
      ...S.documentTypeListItems().filter(
        (listItem) =>
          !['documentFolder', 'documentFile'].includes(
            String(listItem.getId())
          )
      ),
    ])
