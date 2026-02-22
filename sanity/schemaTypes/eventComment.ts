import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'eventComment',
  title: 'Site Comment',
  type: 'document',
  fields: [
    defineField({
      name: 'event',
      title: 'Event',
      type: 'reference',
      to: [{ type: 'event' }],
    }),
    defineField({
      name: 'post',
      title: 'News Post',
      type: 'reference',
      to: [{ type: 'post' }],
    }),
    defineField({
      name: 'parentComment',
      title: 'Parent Comment',
      type: 'reference',
      to: [{ type: 'eventComment' }],
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'createdAt',
      title: 'Submitted at',
      type: 'datetime',
      options: { dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm', timeStep: 5 },
    }),
  ],
  validation: (rule) =>
    rule.custom((doc: any) => {
      if (doc?.event?._ref || doc?.post?._ref) return true;
      return 'Comment must belong to an event or a news post.';
    }),
  preview: {
    select: {
      title: 'message',
      eventTitle: 'event.title',
      postTitle: 'post.title',
      media: 'event.flyerUrl',
    },
    prepare({ title, eventTitle, postTitle, media }) {
      return {
        title,
        subtitle: eventTitle || postTitle || 'Unassigned',
        media,
      };
    },
  },
});
