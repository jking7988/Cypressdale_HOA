// schemas/documentFile.ts
import {defineType, defineField} from 'sanity';

export default defineType({
  name: 'documentFile',
  title: 'Document (PDF, etc.)',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
    }),
    defineField({
      name: 'folder',
      title: 'Folder',
      type: 'reference',
      to: [{type: 'documentFolder'}],
      description: 'Which folder this document belongs to.',
      validation: (Rule) =>
        Rule.required().error('Please choose a folder for this document'),
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      options: {
        accept: '.pdf,.doc,.docx',
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
});
