import {defineField, defineType} from 'sanity';

export default defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: rule => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date & Time',
      type: 'datetime',
      validation: rule => rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End Date & Time',
      type: 'datetime',
    }),

    defineField({
      name: 'flyer',
      title: 'Flyer (optional)',
      type: 'file',
      options: {
        accept: 'image/*,application/pdf',
      },
    }),

    // Simple counters, updated by the API
    defineField({
      name: 'rsvpYes',
      title: 'RSVP – Going',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'rsvpMaybe',
      title: 'RSVP – Maybe',
      type: 'number',
      initialValue: 0,
    }),
  ],
});
