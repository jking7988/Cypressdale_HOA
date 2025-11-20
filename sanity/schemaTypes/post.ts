import {defineField, defineType, defineArrayMember} from 'sanity';

export default defineType({
  name: 'post',
  title: 'Post / News',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: rule => rule.required().max(160),
    }),

    // ⭐ NEW: topic / category
    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'string',
      description: 'Used to show a badge and icon on the news detail page.',
      options: {
        list: [
          {title: 'General update', value: 'general'},
          {title: 'Elections / Board', value: 'elections'},
          {title: 'Pool', value: 'pool'},
          {title: 'Community event', value: 'events'},
          {title: 'Maintenance / repairs', value: 'maintenance'},
        ],
        layout: 'radio', // or 'dropdown' if you prefer a select
      },
      initialValue: 'general',
    }),

    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description: 'Short teaser shown on the homepage and news list (and used as an “Important info” callout).',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{title: 'Normal', value: 'normal'}],
          lists: [],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [{name: 'href', type: 'url', title: 'URL'}],
              },
            ],
          },
        }),
      ],
    }),

    // ⭐ Date used for calendar / deadlines / effective date
    defineField({
      name: 'newsDate',
      title: 'News date / deadline',
      type: 'datetime',
      description:
        'Used on the news calendar (e.g. submission deadline, effective date). If empty, publish date is used.',
    }),

    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{type: 'block'}],
    }),

    defineField({
      name: 'publishedAt',
      title: 'Publish Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: rule => rule.required(),
    }),
  ],
});
