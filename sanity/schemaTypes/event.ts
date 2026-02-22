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
        {
          name: 'link',
          title: 'Link',
          type: 'object',
          fields: [
            {
              name: 'href',
              title: 'URL',
              type: 'url',
              validation: (rule: any) =>
                rule.uri({
                  allowRelative: true,
                  scheme: ['http', 'https', 'mailto', 'tel'],
                }),
            },
            {
              name: 'openInNewTab',
              title: 'Open in new tab',
              type: 'boolean',
              initialValue: true,
            },
          ],
        },
      ],
    },
  },
];

export default defineType({
  name: 'event',
  title: 'Event',
  type: 'document',

  groups: [
    {name: 'details', title: 'Details', default: true},
    {name: 'content', title: 'Content & Customization'},
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
      title: 'Description (deprecated)',
      type: 'text',
      group: 'details',
      hidden: true,
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
    defineField({
      name: 'isMultiDayEvent',
      title: 'Multi-Day Event',
      type: 'boolean',
      description: 'Enable a second date range for this event.',
      initialValue: false,
      group: 'details',
    }),
    defineField({
      name: 'secondStartDate',
      title: 'Second Start Date & Time',
      type: 'datetime',
      group: 'details',
      hidden: ({document}) => !document?.isMultiDayEvent,
      validation: (rule) =>
        rule.custom((value, context: any) => {
          if (!context?.document?.isMultiDayEvent) return true
          if (!value) return 'Second start date is required when Multi-Day Event is enabled.'
          return true
        }),
    }),
    defineField({
      name: 'secondEndDate',
      title: 'Second End Date & Time',
      type: 'datetime',
      group: 'details',
      hidden: ({document}) => !document?.isMultiDayEvent,
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
            {name: 'title', type: 'string', title: 'Section title'},
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
                  {title: 'Left', value: 'left'},
                  {title: 'Centered', value: 'center'},
                  {title: 'Right', value: 'right'},
                ],
                layout: 'radio',
              },
              initialValue: 'left',
            },
            {name: 'backgroundColor', title: 'Background color', type: 'color'},
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
                  {title: 'Vertical (top to bottom)', value: 'to bottom'},
                  {title: 'Horizontal (left to right)', value: 'to right'},
                ],
                layout: 'radio',
              },
            },
            {name: 'borderColor', title: 'Border color', type: 'color', fieldset: 'borderSettings'},
            {
              name: 'borderStyle',
              title: 'Border strength',
              type: 'string',
              fieldset: 'borderSettings',
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
            {name: 'body', type: 'array', of: portableTextWithTextColor},
          ],
        },
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
            {name: 'backgroundColor', title: 'Background color', type: 'color'},
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
                  {title: 'Vertical (top to bottom)', value: 'to bottom'},
                  {title: 'Horizontal (left to right)', value: 'to right'},
                ],
                layout: 'radio',
              },
            },
            {name: 'borderColor', title: 'Border color', type: 'color', fieldset: 'borderSettings'},
            {
              name: 'borderStyle',
              title: 'Border strength',
              type: 'string',
              fieldset: 'borderSettings',
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
            {name: 'body', type: 'array', of: portableTextWithTextColor},
          ],
        },
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
                  {title: 'Left', value: 'left'},
                  {title: 'Centered', value: 'center'},
                  {title: 'Right', value: 'right'},
                ],
                layout: 'radio',
              },
              initialValue: 'left',
            },
            {name: 'showDividerAbove', type: 'boolean', title: 'Show divider above'},
            {name: 'showDividerBelow', type: 'boolean', title: 'Show divider below'},
            {name: 'backgroundColor', title: 'Background color', type: 'color'},
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
                  {title: 'Vertical (top to bottom)', value: 'to bottom'},
                  {title: 'Horizontal (left to right)', value: 'to right'},
                ],
                layout: 'radio',
              },
            },
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
            {name: 'borderColor', title: 'Border color', type: 'color', fieldset: 'borderSettings'},
            {
              name: 'borderStyle',
              title: 'Border strength',
              type: 'string',
              fieldset: 'borderSettings',
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
            {name: 'title', title: 'Section title', type: 'string'},
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
      description: 'Controls width and overall layout of the event page.',
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
      name: 'flyer',
      title: 'Flyer (optional)',
      type: 'file',
      group: 'flyerRsvp',
      options: {
        accept: 'image/*,application/pdf',
      },
    }),
    defineField({
      name: 'rsvps',
      title: 'RSVP entries (legacy)',
      type: 'array',
      group: 'flyerRsvp',
      hidden: true,
      readOnly: true,
      of: [
        {
          type: 'object',
          name: 'rsvp',
          title: 'RSVP entry',
          fields: [
            {name: 'name', title: 'Name', type: 'string'},
            {name: 'email', title: 'Email', type: 'string'},
            {
              name: 'status',
              title: 'Status',
              type: 'string',
              options: {
                list: [
                  {title: 'Going', value: 'yes'},
                  {title: 'Maybe', value: 'maybe'},
                ],
                layout: 'radio',
              },
            },
            {name: 'createdAt', title: 'Submitted at', type: 'datetime'},
          ],
        },
      ],
    }),
    defineField({
      name: 'rsvpYes',
      title: 'RSVP - Going',
      type: 'number',
      group: 'flyerRsvp',
      initialValue: 0,
    }),
    defineField({
      name: 'rsvpMaybe',
      title: 'RSVP - Maybe',
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
      const subtitle = [date, location].filter(Boolean).join(' - ');
      return {
        title: title || 'Untitled event',
        subtitle,
      };
    },
  },
});

