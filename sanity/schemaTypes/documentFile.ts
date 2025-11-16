// documentFile.ts
import { defineType, defineField } from 'sanity';

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
      name: 'folder',
      title: 'Folder',
      type: 'reference',
      to: [{ type: 'documentFolder' }],
      validation: (Rule) => Rule.required(),
      description: 'Choose which folder this document appears in.',
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      validation: (Rule) => Rule.required(),
      options: {
        storeOriginalFilename: true,
      },
    }),
    defineField({
      name: 'uploadedAt',
      title: 'Uploaded At',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  initialValue: () => ({
    uploadedAt: new Date().toISOString(),
  }),
});
