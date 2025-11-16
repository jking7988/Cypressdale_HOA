// documentFolder.ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'documentFolder',
  title: 'Document Folder',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Folder name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description (optional)',
      type: 'text',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers show first on the Documents page.',
    }),
  ],
});
