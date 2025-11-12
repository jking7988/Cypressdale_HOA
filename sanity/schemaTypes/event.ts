import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'start', title: 'Start', type: 'datetime', validation: (r) => r.required() }),
    defineField({ name: 'end', title: 'End', type: 'datetime' }),
    defineField({ name: 'location', type: 'string' }),
    defineField({ name: 'description', type: 'text' }),
  ],
});
