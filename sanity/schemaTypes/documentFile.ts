import {defineType, defineField} from 'sanity';

export default defineType({
  name: 'documentFile',
  title: 'Document (PDF, etc.)',
  type: 'document',

  groups: [
    {name: 'details', title: 'Details', default: true},
    {name: 'file', title: 'File'},
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'details',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'details',
    }),
    defineField({
      name: 'category',
      title: 'Category / Folder',
      type: 'string',
      group: 'details',
      options: {
        list: [
          {title: 'Governing Documents', value: 'Governing Documents'},
          {title: 'Neighborhood Plat Maps', value: 'Neighborhood Plat Maps'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      group: 'file',
      validation: (Rule) => Rule.required(),
    }),
  ],

  orderings: [
    {
      title: 'Category & title',
      name: 'categoryTitle',
      by: [
        {field: 'category', direction: 'asc'},
        {field: 'title', direction: 'asc'},
      ],
    },
  ],

  preview: {
    select: {
      title: 'title',
      category: 'category',
      file: 'file.asset.originalFilename',
    },
    prepare({title, category, file}) {
      return {
        title: title || 'Untitled document',
        subtitle: [category, file].filter(Boolean).join(' • '),
      };
    },
  },
});
