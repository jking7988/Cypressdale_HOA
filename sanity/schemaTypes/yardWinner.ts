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

    // 🔽 UPDATED MONTH FIELD
    defineField({
      name: 'month',
      title: 'Month',
      type: 'date',
      description:
        'Pick any day in the winning month. The website will display this as Month + Year (for example, "November 2025").',
      validation: (Rule) => Rule.required(),
    }),
    // 🔼 NOW Studio shows a real date like 2025-11-01 instead of "November yyyy"

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

    // 🔽 REPLACED single "photo" with "photos" array
    defineField({
      name: 'photos',
      title: 'Photos (optional)',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
        },
      ],
      options: {
        layout: 'grid',
      },
      description:
        'Upload one or more photos of the winning yard. You can blur the house number if desired.',
    }),
    // 🔼
  ],

  preview: {
    select: {
      title: 'title',
      month: 'month',
      // use the first photo for preview
      media: 'photos.0',
    },
    prepare(selection) {
      const { title, month, media } = selection;
      const d = month ? new Date(month as string) : null;
      const monthLabel = d
        ? d.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })
        : 'Month not set';
      return {
        title: title || 'Yard Winner',
        subtitle: monthLabel,
        media,
      };
    },
  },
});
