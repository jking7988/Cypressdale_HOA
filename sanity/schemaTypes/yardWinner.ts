// sanity/schemaTypes/yardWinner.ts
import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'yardWinner',
  title: 'Yard of the Month Winner',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'Example: "May 2025 – Oak Bend Section" or similar.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'month',
      title: 'Month',
      type: 'date',
      options: {
        dateFormat: 'MMMM yyyy',
      },
      description: 'Pick any day in the winning month. Displayed as Month + Year on the site.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'streetOrBlock',
      title: 'Street / Block (optional)',
      type: 'string',
      description:
        'Optional. Use a street or block instead of a full address for privacy.',
    }),
    defineField({
      name: 'description',
      title: 'Notes / Description (optional)',
      type: 'text',
      rows: 3,
      description:
        'Short description of what made this yard stand out (used on the website).',
    }),
    defineField({
      name: 'photo',
      title: 'Photo (optional)',
      type: 'image',
      options: {
        hotspot: true,
      },
      description:
        'Optional photo of the winning yard. You can blur the house number if desired.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      month: 'month',
      media: 'photo',
    },
    prepare(selection) {
      const { title, month, media } = selection;
      const d = month ? new Date(month as string) : null;
      const monthLabel = d
        ? d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : 'Month not set';
      return {
        title: title || 'Yard Winner',
        subtitle: monthLabel,
        media,
      };
    },
  },
});
