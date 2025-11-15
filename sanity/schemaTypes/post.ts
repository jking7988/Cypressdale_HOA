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

    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description: 'Short teaser shown on the homepage and news list.',
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

    // ⭐ NEW: date used for the calendar / deadline / effective date
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
