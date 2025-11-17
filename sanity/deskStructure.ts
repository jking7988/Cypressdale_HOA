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
          S.list()
            .title('Documents')
            .items([
              S.listItem()
                .title('Folders')
                .child(
                  S.documentTypeList('documentFolder').title('Document Folders'),
                ),
              S.listItem()
                .title('Files')
                .child(
                  S.documentTypeList('documentFile').title('Document Files'),
                ),
            ]),
        ),

      // Events
      S.listItem()
        .title('Events')
        .child(S.documentTypeList('event').title('Events')),

      // News
      S.listItem()
        .title('News')
        .child(S.documentTypeList('post').title('News')),

      // Yard of the Month
      S.listItem()
        .title('Yard of the Month Winners')
        .child(
          S.documentTypeList('yardWinner')
            .title('Yard of the Month Winners'),
        ),

      // Holiday Decorating Winners
      S.listItem()
        .title('Holiday Winners')
        .child(
          S.documentTypeList('holidayWinner')
            .title('Holiday Winners'),
        ),

      // Everything else
      ...S.documentTypeListItems().filter((item) => {
        const id = String(item.getId());
        return ![
          'documentFile',
          'documentFolder',
          'event',
          'post',
          'yardWinner',
          'holidayWinner',
          'rsvpResponse', // 👈 make sure RSVPs are NOT their own section
        ].includes(id);
      }),
    ]);
