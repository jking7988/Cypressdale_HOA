import {defineField, defineType} from 'sanity';

export default defineType({
  name: 'post',
  title: 'Post / News',
  type: 'document',

  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'meta', title: 'Meta'},
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'array',
      of: [{type: 'block'}],
      group: 'content',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{type: 'block'}],
      group: 'content',
    }),
    defineField({
      name: 'sections',
      title: 'Page sections',
      type: 'array',
      group: 'content',   // 
      of: [
        {
          type: 'object',
          name: 'textSection',
          title: 'Text section',
          fields: [
            { name: 'title', type: 'string', title: 'Section title' },
            {
              name: 'alignment',
              type: 'string',
              title: 'Text alignment',
              options: {
                list: [
                  { title: 'Left', value: 'left' },
                  { title: 'Centered', value: 'center' },
                ],
                layout: 'radio',
              },
              initialValue: 'left',
            },
            { name: 'body', type: 'array', of: [{ type: 'block' }] },
          ],
        },
        {
          type: 'object',
          name: 'imageWithText',
          title: 'Image + text',
          fields: [
            { name: 'image', type: 'image', title: 'Image', options: { hotspot: true } },
            {
              name: 'imagePosition',
              type: 'string',
              title: 'Image position',
              options: {
                list: [
                  { title: 'Left', value: 'left' },
                  { title: 'Right', value: 'right' },
                ],
                layout: 'radio',
              },
              initialValue: 'left',
            },
            { name: 'body', type: 'array', of: [{ type: 'block' }] },
          ],
        },
        {
          type: 'object',
          name: 'fullWidthCallout',
          title: 'Full-width callout',
          fields: [
            {
              name: 'tone',
              type: 'string',
              title: 'Tone',
              options: {
                list: [
                  { title: 'Info', value: 'info' },
                  { title: 'Warning', value: 'warning' },
                  { title: 'Success', value: 'success' },
                ],
                layout: 'radio',
              },
              initialValue: 'info',
            },

            // 👇 NEW: simple color scheme selector
            {
              name: 'colorScheme',
              title: 'Color scheme (optional)',
              type: 'string',
              description: 'Override the default colors for this callout.',
              options: {
                list: [
                  { title: 'Sky', value: 'sky' },
                  { title: 'Emerald', value: 'emerald' },
                  { title: 'Amber', value: 'amber' },
                  { title: 'Rose', value: 'rose' },
                  { title: 'Slate', value: 'slate' },
                ],
                layout: 'radio',
              },
            },

            { 
              name: 'body', 
              type: 'array', 
              title: 'Text',
              of: [{ type: 'block' }] 
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'layoutVariant',
      title: 'Page layout',
      type: 'string',
      description: 'Controls width and overall layout of the article page.',
      initialValue: 'standard',
      group: 'content',                   // 👈 add this
      options: {
        list: [
          { title: 'Standard (default)', value: 'standard' },
          { title: 'Narrow reading column', value: 'narrow' },
          { title: 'Wide / full-width card', value: 'wide' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'showRightSidebar',
      title: 'Show sidebar (calendar & signup)',
      type: 'boolean',
      initialValue: true,
      group: 'content',                   // 👈 add this
    }),

    defineField({
      name: 'topic',
      title: 'Type of update',
      type: 'string',
      description: 'Controls the badge style on the website.',
      initialValue: 'general',
      group: 'content',                   // 👈 add this
      options: {
        list: [
          {title: 'General update', value: 'general'},
          {title: 'Elections', value: 'elections'},
          {title: 'Pool update', value: 'pool'},
          {title: 'Community event', value: 'events'},
          {title: 'Maintenance', value: 'maintenance'},
        ],
        layout: 'radio',
      },
      validation: rule => rule.required(),
    }),
    
    defineField({
      name: 'publishedAt',
      title: 'Publish Date',
      type: 'datetime',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
  ],

  orderings: [
    {
      title: 'Publish date (newest first)',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],

  preview: {
    select: {
      title: 'title',
      publishedAt: 'publishedAt',
      excerpt: 'excerpt',
    },
    prepare({title, publishedAt, excerpt}) {
      const date = publishedAt
        ? new Date(publishedAt).toLocaleString()
        : 'Draft';
      return {
        title: title || 'Untitled post',
        subtitle: date,
        // Studio shows the first lines of the body/excerpt automatically,
        // so keeping it simple here is fine.
      };
    },
  },
});
