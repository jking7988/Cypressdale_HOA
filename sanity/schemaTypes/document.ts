import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'documentFile',
  title: 'Document (PDF, etc.)',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'description', type: 'text' }),
    defineField({ name: 'category', type: 'string' }),
    defineField({ name: 'file', type: 'file', options: { accept: '.pdf,.doc,.docx' }, validation: (r) => r.required() }),
  ],
});
