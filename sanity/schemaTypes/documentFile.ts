// documentFile.ts
import {defineType, defineField} from 'sanity'

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
      name: 'category',
      title: 'Category / Folder',
      type: 'string',
      options: {
        list: [          
          {title: 'Neighborhood Plat Maps', value: 'Neighborhood Plat Maps'},
          {title: 'Pool Information', value: 'Pool Information'},
          {title: 'ACC Documents', value: 'ACC Documents'},
          // add more “folders” here if you want
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      validation: (Rule) => Rule.required(),
    }),
  ],
})
