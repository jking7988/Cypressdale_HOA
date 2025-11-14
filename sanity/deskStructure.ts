// deskStructure.ts
import type {StructureResolver} from 'sanity/structure'

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Document Library')
        .child(
          // Column that lists each top-level folder
          S.documentTypeList('documentFolder')
            .title('Folders')
            .filter('_type == "documentFolder" && !defined(parent)')
            .child((folderId) => {
              const publishedId = folderId.replace(/^drafts\./, '')

              return S.list()
                .title('Folder')
                .items([
                  // Open the folder editor (rename, delete, etc.)
                  S.listItem()
                    .title('Edit Folder')
                    .child(
                      S.document()
                        .schemaType('documentFolder')
                        .documentId(folderId)
                    ),

                  // Show contents = subfolders + files
                  S.listItem()
                    .title('Contents')
                    .child(
                      S.documentList()
                        .title('Contents')
                        .filter(
                          '(_type == "documentFolder" && parent._ref in [$folderId, $publishedId]) || ' +
                            '(_type == "documentFile" && folder._ref in [$folderId, $publishedId])'
                        )
                        .params({folderId, publishedId})
                        // ⬇️ IMPORTANT: "+" menu items, with auto-parent/auto-folder
                        .initialValueTemplates([
                          S.initialValueTemplateItem('subfolderInFolder', {
                            parentId: publishedId,
                          }),
                          S.initialValueTemplateItem('fileInFolder', {
                            folderId: publishedId,
                          }),
                        ])
                    ),
                ])
            })
        ),

      // (You already removed All Files; keep it gone if you want)
      // S.listItem()...

      // Other content types
      ...S.documentTypeListItems().filter(
        (i) => !['documentFolder', 'documentFile'].includes(String(i.getId()))
      ),
    ])
