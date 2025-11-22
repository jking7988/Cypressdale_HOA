// schemas/post.ts
import {defineField, defineType} from 'sanity';

export default defineType({
  name: 'post',
  title: 'Post / News',
  type: 'document',

  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'meta', title: 'Meta'},
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'array',
      of: [{type: 'block'}],
      group: 'content',
    }),

    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{type: 'block'}],
      group: 'content',
    }),

    // PAGE SECTIONS
    defineField({
      name: 'sections',
      title: 'Page sections',
      type: 'array',
      group: 'content',
      of: [
        //
        // TEXT SECTION
        //
        {
          type: 'object',
          name: 'textSection',
          title: 'Text section',
          fields: [
            {name: 'title', type: 'string', title: 'Section title'},

            {
              name: 'alignment',
              type: 'string',
              title: 'Text alignment',
              options: {
                list: [
                  {title: 'Left', value: 'left'},
                  {title: 'Centered', value: 'center'},
                  {title: 'Right', value: 'right'},
                ],
                layout: 'radio',
              },
              initialValue: 'left',
            },

            // 🎨 separate background + border colors
            {
              name: 'backgroundColor',
              title: 'Background color',
              type: 'color',
              description: 'Fill color behind this section.',
            },
            {
              name: 'backgroundColorEnd',
              title: 'Secondary background color (for gradient)',
              type: 'color',
              description:
                'If set, creates a gradient from Background color → this color.',
            },
            {
              name: 'gradientDirection',
              title: 'Gradient direction',
              type: 'string',
              options: {
                list: [
                  {title: 'Vertical (top → bottom)', value: 'to bottom'},
                  {title: 'Horizontal (left → right)', value: 'to right'},
                ],
                layout: 'radio',
              },
            },
            {
              name: 'borderColor',
              title: 'Border color',
              type: 'color',
              description: 'Outline color for this section.',
            },

            {
              name: 'borderStyle',
              title: 'Border strength',
              type: 'string',
              options: {
                list: [
                  {title: 'None', value: 'none'},
                  {title: 'Subtle', value: 'subtle'},
                  {title: 'Strong', value: 'strong'},
                ],
                layout: 'radio',
              },
              initialValue: 'subtle',
            },
            {
              name: 'width',
              title: 'Width',
              type: 'string',
              options: {
                list: [
                  {title: 'Default', value: 'default'},
                  {title: 'Narrow', value: 'narrow'},
                  {title: 'Wide', value: 'wide'},
                  {title: 'Full bleed', value: 'full'},
                ],
                layout: 'radio',
              },
            },
            {
              name: 'spacing',
              title: 'Vertical spacing',
              type: 'string',
              options: {
                list: [
                  {title: 'Tight', value: 'tight'},
                  {title: 'Normal', value: 'normal'},
                  {title: 'Spacious', value: 'spacious'},
                ],
                layout: 'radio',
              },
            },

            {name: 'body', type: 'array', of: [{type: 'block'}]},
          ],
        },

        //
        // IMAGE + TEXT
        //
        {
          type: 'object',
          name: 'imageWithText',
          title: 'Image + text',
          fields: [
            {
              name: 'image',
              type: 'image',
              title: 'Image',
              options: {hotspot: true},
            },
            {
              name: 'imagePosition',
              type: 'string',
              title: 'Image position',
              options: {
                list: [
                  {title: 'Left', value: 'left'},
                  {title: 'Centered', value: 'center'},
                  {title: 'Right', value: 'right'},
                ],
                layout: 'radio',
              },
              initialValue: 'left',
            },

            // 🎨 colors
            {
              name: 'backgroundColor',
              title: 'Background color',
              type: 'color',
            },
            {
              name: 'backgroundColorEnd',
              title: 'Secondary background color (for gradient)',
              type: 'color',
            },
            {
              name: 'gradientDirection',
              title: 'Gradient direction',
              type: 'string',
              options: {
                list: [
                  {title: 'Vertical (top → bottom)', value: 'to bottom'},
                  {title: 'Horizontal (left → right)', value: 'to right'},
                ],
                layout: 'radio',
              },
            },
            {
              name: 'borderColor',
              title: 'Border color',
              type: 'color',
            },

            {
              name: 'borderStyle',
              title: 'Border strength',
              type: 'string',
              options: {
                list: [
                  {title: 'None', value: 'none'},
                  {title: 'Subtle', value: 'subtle'},
                  {title: 'Strong', value: 'strong'},
                ],
                layout: 'radio',
              },
              initialValue: 'subtle',
            },
            {
              name: 'width',
              title: 'Width',
              type: 'string',
              options: {
                list: [
                  {title: 'Default', value: 'default'},
                  {title: 'Narrow', value: 'narrow'},
                  {title: 'Wide', value: 'wide'},
                  {title: 'Full bleed', value: 'full'},
                ],
                layout: 'radio',
              },
            },
            {
              name: 'spacing',
              title: 'Vertical spacing',
              type: 'string',
              options: {
                list: [
                  {title: 'Tight', value: 'tight'},
                  {title: 'Normal', value: 'normal'},
                  {title: 'Spacious', value: 'spacious'},
                ],
                layout: 'radio',
              },
            },

            {name: 'body', type: 'array', of: [{type: 'block'}]},
          ],
        },

        //
        // TOPIC SECTION (replaces fullWidthCallout)
        //
        {
          type: 'object',
          name: 'topicSection',
          title: 'Topic section',
          fields: [
            {
              name: 'topicLabel',
              type: 'string',
              title: 'Topic label',
              description: 'e.g. Reminder, Pool Update, Elections',
            },
            {
              name: 'icon',
              type: 'string',
              title: 'Icon',
              description: 'Emoji or short label shown before the topic label.',
            },

            {
              name: 'alignment',
              type: 'string',
              title: 'Text alignment',
              options: {
                list: [
                  {title: 'Left', value: 'left'},
                  {title: 'Centered', value: 'center'},
                  {title: 'Right', value: 'right'},
                ],
                layout: 'radio',
              },
              initialValue: 'left',
            },

            {
              name: 'showDividerAbove',
              type: 'boolean',
              title: 'Show divider above',
            },
            {
              name: 'showDividerBelow',
              type: 'boolean',
              title: 'Show divider below',
            },

            // background + gradient
            {
              name: 'backgroundColor',
              title: 'Background color',
              type: 'color',
            },
            {
              name: 'backgroundColorEnd',
              title: 'Secondary background color (for gradient)',
              type: 'color',
            },
            {
              name: 'gradientDirection',
              title: 'Gradient direction',
              type: 'string',
              options: {
                list: [
                  {title: 'Vertical (top → bottom)', value: 'to bottom'},
                  {title: 'Horizontal (left → right)', value: 'to right'},
                ],
                layout: 'radio',
              },
            },

            // optional background image
            {
              name: 'backgroundImage',
              title: 'Background image',
              type: 'image',
              options: {hotspot: true},
            },
            {
              name: 'backgroundImageOpacity',
              title: 'Background image strength',
              type: 'number',
              description: '0 = invisible, 1 = full image',
              options: {min: 0, max: 1, step: 0.05},
            },

            // border
            {
              name: 'borderColor',
              title: 'Border color',
              type: 'color',
            },
            {
              name: 'borderStyle',
              title: 'Border strength',
              type: 'string',
              options: {
                list: [
                  {title: 'None', value: 'none'},
                  {title: 'Subtle', value: 'subtle'},
                  {title: 'Strong', value: 'strong'},
                ],
                layout: 'radio',
              },
              initialValue: 'subtle',
            },

            // layout
            {
              name: 'width',
              title: 'Width',
              type: 'string',
              options: {
                list: [
                  {title: 'Default', value: 'default'},
                  {title: 'Narrow', value: 'narrow'},
                  {title: 'Wide', value: 'wide'},
                  {title: 'Full bleed', value: 'full'},
                ],
                layout: 'radio',
              },
            },
            {
              name: 'spacing',
              title: 'Vertical spacing',
              type: 'string',
              options: {
                list: [
                  {title: 'Tight', value: 'tight'},
                  {title: 'Normal', value: 'normal'},
                  {title: 'Spacious', value: 'spacious'},
                ],
                layout: 'radio',
              },
            },

            {
              name: 'title',
              title: 'Section title',
              type: 'string',
            },
            {
              name: 'body',
              type: 'array',
              title: 'Text',
              of: [{type: 'block'}],
            },
          ],
        },
      ],
    }),

    defineField({
      name: 'layoutVariant',
      title: 'Page layout',
      type: 'string',
      description: 'Controls width and overall layout of the article page.',
      initialValue: 'standard',
      group: 'content',
      options: {
        list: [
          {title: 'Standard (default)', value: 'standard'},
          {title: 'Narrow reading column', value: 'narrow'},
          {title: 'Wide / full-width card', value: 'wide'},
        ],
        layout: 'radio',
      },
    }),

    defineField({
      name: 'showRightSidebar',
      title: 'Show sidebar (calendar & signup)',
      type: 'boolean',
      initialValue: true,
      group: 'content',
    }),

    defineField({
      name: 'topic',
      title: 'Type of update',
      type: 'string',
      description: 'Controls the badge style on the website.',
      initialValue: 'general',
      group: 'content',
      options: {
        list: [
          {title: 'General update', value: 'general'},
          {title: 'Elections', value: 'elections'},
          {title: 'Pool update', value: 'pool'},
          {title: 'Community event', value: 'events'},
          {title: 'Maintenance', value: 'maintenance'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'publishedAt',
      title: 'Publish Date',
      type: 'datetime',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
  ],

  orderings: [
    {
      title: 'Publish date (newest first)',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],

  preview: {
    select: {
      title: 'title',
      publishedAt: 'publishedAt',
    },
    prepare({title, publishedAt}) {
      const date = publishedAt
        ? new Date(publishedAt).toLocaleString()
        : 'Draft';
      return {
        title: title || 'Untitled post',
        subtitle: date,
      };
    },
  },
});
