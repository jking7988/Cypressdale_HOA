// deskStructure.ts
import type {StructureResolver} from 'sanity/structure'

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      // === Document Library (unchanged from our last version) ===
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

      // === Events with nested RSVPs ===
      S.listItem()
        .title('Events')
        .child(
          S.documentTypeList('event')
            .title('Events')
            .child((eventId) =>
              S.list()
                .title('Event')
                .items([
                  // Edit the event itself
                  S.listItem()
                    .title('Edit Event')
                    .child(
                      S.document()
                        .schemaType('event')
                        .documentId(eventId)
                    ),

                  // RSVPs for this event
                  S.listItem()
                    .title('RSVPs')
                    .child(
                      S.documentList()
                        .title('RSVPs')
                        // 👇 if your field is not "event", change this line
                        .filter(
                          '_type == "rsvpResponse" && event._ref == $eventId'
                        )
                        .params({eventId})
                    ),
                ])
            )
        ),

      // === Everything else (no folders/files/RSVP responses here) ===
      ...S.documentTypeListItems().filter((item) => {
        const id = String(item.getId())
        return !['documentFolder', 'documentFile', 'rsvpResponse', 'event'].includes(id)
      }),
    ])
