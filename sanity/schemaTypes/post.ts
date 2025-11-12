import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'post',
  title: 'Post / News',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'excerpt', type: 'text' }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
  ],
});
