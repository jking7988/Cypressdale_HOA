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

    // Optional: simple string category (you can swap to an options list later)
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
    }),

    // 🔑 Link to your documentFolder
    defineField({
      name: 'folder',
      title: 'Folder',
      type: 'reference',
      to: [{type: 'documentFolder'}],
      description: 'Which folder this document belongs to.',
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
