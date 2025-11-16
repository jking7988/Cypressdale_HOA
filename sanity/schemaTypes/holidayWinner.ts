// sanity/schemaTypes/holidayWinner.ts
import {defineField, defineType} from 'sanity';

export default defineType({
  name: 'holidayWinner',
  title: 'Holiday Decorating Winner',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Home / Display Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'holiday',
      title: 'Holiday',
      type: 'string',
      options: {
        list: [
          {title: 'Christmas', value: 'christmas'},
          {title: 'Halloween', value: 'halloween'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      initialValue: () => new Date().getFullYear(),
      validation: (rule) => rule.required().min(2025),
    }),
    defineField({
      name: 'place',
      title: 'Place',
      type: 'string',
      options: {
        list: [
          {title: '1st Place', value: '1'},
          {title: '2nd Place', value: '2'},
          {title: '3rd Place', value: '3'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'streetOrBlock',
      title: 'Street / Block (optional)',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'photo',
      title: 'Main Photo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'photos',
      title: 'Additional Photos',
      type: 'array',
      of: [{type: 'image'}],
      options: {layout: 'grid'},
    }),
  ],
});
