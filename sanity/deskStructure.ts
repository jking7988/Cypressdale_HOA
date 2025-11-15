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
            .title('Documents'),
        ),

      // Events → each event shows its own sub-list
      S.listItem()
        .title('Events')
        .child(
          S.documentTypeList('event')
            .title('Events')
            .child((eventId) =>
              S.list()
                .title('Event')
                .items([
                  // Event editor
                  S.listItem()
                    .title('Event details')
                    .child(
                      S.document()
                        .schemaType('event')
                        .documentId(eventId),
                    ),

                  // RSVP Responses for this event
                  S.listItem()
                    .title('RSVP Responses')
                    .child(
                      S.documentTypeList('rsvpResponse')
                        .title('RSVP Responses')
                        .filter('event._ref == $eventId')
                        .params({eventId}),
                    ),
                    // sanity/deskStructure.ts (inside the default export)
                  S.listItem()
                    .title('Yard of the Month Winners')
                    .child(
                      S.documentTypeList('yardWinner').title('Yard of the Month Winners')
                    ),
                ]),
            ),
        ),

      // Everything else (posts, etc.)
      ...S.documentTypeListItems().filter((item) => {
        const id = String(item.getId());
        return !['documentFile', 'event', 'rsvpResponse'].includes(id);
      }),
    ]);
