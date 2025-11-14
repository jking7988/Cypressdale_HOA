// schemas/documentFolder.ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'documentFolder',
  title: 'Document Folder',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Folder Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'parent',
      title: 'Parent Folder',
      type: 'reference',
      to: [{ type: 'documentFolder' }],
      description: 'Leave empty for a top-level folder.',
    }),
  ],
});
