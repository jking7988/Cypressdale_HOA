// deskStructure.ts
import type {StructureResolver} from 'sanity/structure'

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Document Library')
        .child(
          S.documentTypeList('documentFolder')
            .title('Folders')
            .filter('_type == "documentFolder" && !defined(parent)')
            .child((folderId) => {
              const publishedId = folderId.replace(/^drafts\./, '')

              return S.list()
                .title('Folder')
                .items([
                  S.listItem()
                    .title('Edit Folder')
                    .child(
                      S.document()
                        .schemaType('documentFolder')
                        .documentId(folderId)
                    ),
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
                        .initialValueTemplates([
                          S.initialValueTemplateItem('subfolderInFolder').parameters(
                            {parentId: publishedId}
                          ),
                          S.initialValueTemplateItem('fileInFolder').parameters({
                            folderId: publishedId,
                          }),
                        ])
                    ),
                ])
            })
        ),

      // 👇 NEW: Unfiled docs – anything without a folder
      S.listItem()
        .title('Unfiled Documents')
        .child(
          S.documentList()
            .title('Unfiled Documents')
            .filter('_type == "documentFile" && !defined(folder)')
        ),

      // Other content types
      ...S.documentTypeListItems().filter(
        (i) => !['documentFolder', 'documentFile'].includes(String(i.getId()))
      ),
    ])
