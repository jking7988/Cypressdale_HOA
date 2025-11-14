// deskStructure.ts
// @ts-nocheck

export const deskStructure = (S) =>
  S.list()
    .title('Content')
    .items([
      // Documents
      S.listItem()
        .title('Documents')
        .child(
          S.documentTypeList('documentFile')
            .title('Documents')
        ),

      // Events
      S.listItem()
        .title('Events')
        .child(
          S.documentTypeList('event')
            .title('Events')
        ),

      // RSVPs (if you want a direct view)
      S.listItem()
        .title('RSVP Responses')
        .child(
          S.documentTypeList('rsvpResponse')
            .title('RSVP Responses')
        ),

      // Everything else (posts, contact, etc.)
      ...S.documentTypeListItems().filter((item) => {
        const id = String(item.getId())
        return !['documentFile', 'event', 'rsvpResponse'].includes(id)
      }),
    ])
