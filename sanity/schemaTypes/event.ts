import {defineField, defineType} from 'sanity';

export default defineType({
  name: 'event',
  title: 'Event',
  type: 'document',

  // optional, but nice for UI
  groups: [
    {name: 'details', title: 'Details', default: true},
    {name: 'flyerRsvp', title: 'Flyer & RSVP'},
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'details',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'details',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      group: 'details',
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date & Time',
      type: 'datetime',
      group: 'details',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End Date & Time',
      type: 'datetime',
      group: 'details',
    }),

    // Flyer & RSVP group
    defineField({
      name: 'flyer',
      title: 'Flyer (optional)',
      type: 'file',
      group: 'flyerRsvp',
      options: {
        accept: 'image/*,application/pdf',
      },
    }),
    defineField({
      name: 'rsvpYes',
      title: 'RSVP – Going',
      type: 'number',
      group: 'flyerRsvp',
      initialValue: 0,
    }),
    defineField({
      name: 'rsvpMaybe',
      title: 'RSVP – Maybe',
      type: 'number',
      group: 'flyerRsvp',
      initialValue: 0,
    }),
  ],

  orderings: [
    {
      title: 'Event date (newest first)',
      name: 'startDateDesc',
      by: [{field: 'startDate', direction: 'desc'}],
    },
    {
      title: 'Event date (oldest first)',
      name: 'startDateAsc',
      by: [{field: 'startDate', direction: 'asc'}],
    },
  ],

  preview: {
    select: {
      title: 'title',
      startDate: 'startDate',
      location: 'location',
    },
    prepare({title, startDate, location}) {
      const date = startDate
        ? new Date(startDate).toLocaleString()
        : 'No date set';
      const subtitle = [date, location].filter(Boolean).join(' • ');
      return {
        title: title || 'Untitled event',
        subtitle,
      };
    },
  },
});
