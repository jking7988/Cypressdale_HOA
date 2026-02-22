// schemas/post.ts
import {defineField, defineType} from 'sanity';
import InlineTextSizeInput from '../InlineTextSizeInput';
import InlineTextWeightInput from '../InlineTextWeightInput';

const portableTextWithTextColor = [
  {
    type: 'block',
    marks: {
      annotations: [
        {
          name: 'textStyle',
          title: 'Text style',
          type: 'object',
          fields: [
            {name: 'color', title: 'Color', type: 'color'},
            {
              name: 'size',
              title: 'Size (px)',
              type: 'number',
              initialValue: 16,
              components: {input: InlineTextSizeInput},
              validation: (rule: any) => rule.min(10).max(64),
            },
            {
              name: 'weight',
              title: 'Weight',
              type: 'number',
              initialValue: 600,
              components: {input: InlineTextWeightInput},
              validation: (rule: any) => rule.min(100).max(900),
            },
          ],
        },
      ],
    },
  },
];

export default defineType({
  name: 'post',
  title: 'Post / News',
  type: 'document',

  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'meta', title: 'Meta' },
  ],

  fields: [
    // TOP-LEVEL TOPIC (DROPDOWN)
    defineField({
      name: 'topic',
      title: 'Type of update',
      type: 'string',
      description: 'Controls the badge style on the website.',
      initialValue: 'general',
      group: 'content',
      options: {
        list: [
          { title: 'General update', value: 'general' },
          { title: 'Elections', value: 'elections' },
          { title: 'Pool update', value: 'pool' },
          { title: 'Community event', value: 'events' },
          { title: 'Maintenance', value: 'maintenance' },
        ],
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'excerpt',
      title: 'Excerpt (deprecated)',
      type: 'array',
      of: portableTextWithTextColor,
      group: 'content',
      hidden: true,
    }),

    defineField({
      name: 'body',
      title: 'Body (deprecated)',
      type: 'array',
      of: portableTextWithTextColor,
      group: 'content',
      hidden: true,
    }),

    // PAGE SECTIONS
    defineField({
      name: 'sections',
      title: 'Page sections',
      type: 'array',
      group: 'content',
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .error('Add at least one section. Content is now section-based.'),
      of: [
        //
        // TEXT SECTION
        //
        {
          type: 'object',
          name: 'textSection',
          title: 'Text section',
          fieldsets: [
            {
              name: 'titleSettings',
              title: 'Section header controls',
              options: {collapsible: true, collapsed: true},
            },
            {
              name: 'borderSettings',
              title: 'Section border controls',
              options: {collapsible: true, collapsed: true},
            },
          ],
          fields: [
            { name: 'title', type: 'string', title: 'Section title' },
            {
              name: 'titleSize',
              title: 'Section title size',
              type: 'number',
              fieldset: 'titleSettings',
              description: 'Numeric size in pixels.',
              initialValue: 20,
              validation: (rule) => rule.min(12).max(64),
            },
            {
              name: 'titleWeight',
              title: 'Section title thickness',
              type: 'number',
              fieldset: 'titleSettings',
              description: 'Numeric font weight (100-900).',
              initialValue: 600,
              validation: (rule) => rule.min(100).max(900),
            },
            {name: 'titleColor', title: 'Section title color', type: 'color', fieldset: 'titleSettings'},

            {
              name: 'alignment',
              type: 'string',
              title: 'Text alignment',
              options: {
                list: [
                  { title: 'Left', value: 'left' },
                  { title: 'Centered', value: 'center' },
                  { title: 'Right', value: 'right' },
                ],
                layout: 'radio',
              },
              initialValue: 'left',
            },

            // background + gradient
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
                  { title: 'Vertical (top → bottom)', value: 'to bottom' },
                  { title: 'Horizontal (left → right)', value: 'to right' },
                ],
                layout: 'radio',
              },
            },

            // border
            {
              name: 'borderColor',
              title: 'Border color',
              type: 'color',
              fieldset: 'borderSettings',
              description: 'Outline color for this section.',
            },
            {
              name: 'borderStyle',
              title: 'Border strength',
              type: 'string',
              fieldset: 'borderSettings',
              options: {
                list: [
                  { title: 'None', value: 'none' },
                  { title: 'Subtle', value: 'subtle' },
                  { title: 'Strong', value: 'strong' },
                ],
                layout: 'radio',
              },
              initialValue: 'subtle',
            },
            {
              name: 'borderThickness',
              title: 'Border thickness',
              type: 'string',
              fieldset: 'borderSettings',
              initialValue: 'thin',
              options: {
                list: [
                  {title: 'Thin', value: 'thin'},
                  {title: 'Medium', value: 'medium'},
                  {title: 'Thick', value: 'thick'},
                ],
                layout: 'radio',
              },
            },

            // layout
            {
              name: 'width',
              title: 'Width',
              type: 'string',
              options: {
                list: [
                  { title: 'Default', value: 'default' },
                  { title: 'Narrow', value: 'narrow' },
                  { title: 'Wide', value: 'wide' },
                  { title: 'Full bleed', value: 'full' },
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
                  { title: 'Tight', value: 'tight' },
                  { title: 'Normal', value: 'normal' },
                  { title: 'Spacious', value: 'spacious' },
                ],
                layout: 'radio',
              },
            },
            {name: 'body', type: 'array', of: portableTextWithTextColor},
          ],
        },

        //
        // IMAGE + TEXT
        //
        {
          type: 'object',
          name: 'imageWithText',
          title: 'Image + text',
          fieldsets: [
            {
              name: 'borderSettings',
              title: 'Section border controls',
              options: {collapsible: true, collapsed: true},
            },
          ],
          fields: [
            {
              name: 'image',
              type: 'image',
              title: 'Image',
              options: { hotspot: true },
            },
            {
              name: 'imagePosition',
              type: 'string',
              title: 'Image position',
              options: {
                list: [
                  { title: 'Left', value: 'left' },
                  { title: 'Centered', value: 'center' },
                  { title: 'Right', value: 'right' },
                ],
                layout: 'radio',
              },
              initialValue: 'left',
            },

            // colors
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
                  { title: 'Vertical (top → bottom)', value: 'to bottom' },
                  { title: 'Horizontal (left → right)', value: 'to right' },
                ],
                layout: 'radio',
              },
            },
            {
              name: 'borderColor',
              title: 'Border color',
              type: 'color',
              fieldset: 'borderSettings',
            },
            {
              name: 'borderStyle',
              title: 'Border strength',
              type: 'string',
              fieldset: 'borderSettings',
              options: {
                list: [
                  { title: 'None', value: 'none' },
                  { title: 'Subtle', value: 'subtle' },
                  { title: 'Strong', value: 'strong' },
                ],
                layout: 'radio',
              },
              initialValue: 'subtle',
            },
            {
              name: 'borderThickness',
              title: 'Border thickness',
              type: 'string',
              fieldset: 'borderSettings',
              initialValue: 'thin',
              options: {
                list: [
                  {title: 'Thin', value: 'thin'},
                  {title: 'Medium', value: 'medium'},
                  {title: 'Thick', value: 'thick'},
                ],
                layout: 'radio',
              },
            },

            // layout
            {
              name: 'width',
              title: 'Width',
              type: 'string',
              options: {
                list: [
                  { title: 'Default', value: 'default' },
                  { title: 'Narrow', value: 'narrow' },
                  { title: 'Wide', value: 'wide' },
                  { title: 'Full bleed', value: 'full' },
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
                  { title: 'Tight', value: 'tight' },
                  { title: 'Normal', value: 'normal' },
                  { title: 'Spacious', value: 'spacious' },
                ],
                layout: 'radio',
              },
            },
            {name: 'body', type: 'array', of: portableTextWithTextColor},
          ],
        },

        //
        // TOPIC SECTION
        //
        {
          type: 'object',
          name: 'topicSection',
          title: 'Topic section',
          fieldsets: [
            {
              name: 'titleSettings',
              title: 'Section header controls',
              options: {collapsible: true, collapsed: true},
            },
            {
              name: 'borderSettings',
              title: 'Section border controls',
              options: {collapsible: true, collapsed: true},
            },
          ],
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
                  { title: 'Left', value: 'left' },
                  { title: 'Centered', value: 'center' },
                  { title: 'Right', value: 'right' },
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
                  { title: 'Vertical (top → bottom)', value: 'to bottom' },
                  { title: 'Horizontal (left → right)', value: 'to right' },
                ],
                layout: 'radio',
              },
            },

            // background image
            {
              name: 'backgroundImage',
              title: 'Background image',
              type: 'image',
              options: { hotspot: true },
            },
            {
              name: 'backgroundImageOpacity',
              title: 'Background image strength',
              type: 'number',
              description: '0 = invisible, 1 = full image',
              options: { min: 0, max: 1, step: 0.05 },
            },

            // border
            {
              name: 'borderColor',
              title: 'Border color',
              type: 'color',
              fieldset: 'borderSettings',
            },
            {
              name: 'borderStyle',
              title: 'Border strength',
              type: 'string',
              fieldset: 'borderSettings',
              options: {
                list: [
                  { title: 'None', value: 'none' },
                  { title: 'Subtle', value: 'subtle' },
                  { title: 'Strong', value: 'strong' },
                ],
                layout: 'radio',
              },
              initialValue: 'subtle',
            },
            {
              name: 'borderThickness',
              title: 'Border thickness',
              type: 'string',
              fieldset: 'borderSettings',
              initialValue: 'thin',
              options: {
                list: [
                  {title: 'Thin', value: 'thin'},
                  {title: 'Medium', value: 'medium'},
                  {title: 'Thick', value: 'thick'},
                ],
                layout: 'radio',
              },
            },

            // layout
            {
              name: 'width',
              title: 'Width',
              type: 'string',
              options: {
                list: [
                  { title: 'Default', value: 'default' },
                  { title: 'Narrow', value: 'narrow' },
                  { title: 'Wide', value: 'wide' },
                  { title: 'Full bleed', value: 'full' },
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
                  { title: 'Tight', value: 'tight' },
                  { title: 'Normal', value: 'normal' },
                  { title: 'Spacious', value: 'spacious' },
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
              name: 'titleSize',
              title: 'Section title size',
              type: 'number',
              fieldset: 'titleSettings',
              description: 'Numeric size in pixels.',
              initialValue: 20,
              validation: (rule) => rule.min(12).max(64),
            },
            {
              name: 'titleWeight',
              title: 'Section title thickness',
              type: 'number',
              fieldset: 'titleSettings',
              description: 'Numeric font weight (100-900).',
              initialValue: 600,
              validation: (rule) => rule.min(100).max(900),
            },
            {name: 'titleColor', title: 'Section title color', type: 'color', fieldset: 'titleSettings'},
            {
              name: 'body',
              type: 'array',
              title: 'Text',
              of: portableTextWithTextColor,
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
          { title: 'Standard (default)', value: 'standard' },
          { title: 'Narrow reading column', value: 'narrow' },
          { title: 'Wide / full-width card', value: 'wide' },
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
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],

  preview: {
    select: {
      title: 'title',
      publishedAt: 'publishedAt',
    },
    prepare({ title, publishedAt }) {
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

