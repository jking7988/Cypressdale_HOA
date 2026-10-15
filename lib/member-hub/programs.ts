import { z } from 'zod';

export type Program = 'yard' | 'holiday';
export const programs = {
  yard: { title: 'Yard of the Month', kind: 'yardWinner', id: 'program-yard-of-the-month', adminPath: '/admin/yard-of-the-month', publicPath: '/yard-of-the-month' },
  holiday: { title: 'Holiday Decorating', kind: 'holidayWinner', id: 'program-holiday-decorating', adminPath: '/admin/holiday-decorating', publicPath: '/holiday-decorating' },
} as const;
const text = z.string().max(6000);
const image = z.object({ _type: z.literal('image').optional(), asset: z.object({ _type: z.literal('reference').optional(), _ref: z.string().min(1) }) }).nullable().default(null);
const common = {
  pageWidth: z.enum(['standard', 'narrow', 'wide']).default('standard'), backgroundImage: image,
  showContact: z.boolean().default(true), contactTitle: text,
  contactCopy: text,
};
export const yardSettingsSchema = z.object({
  ...common,
  pageTitle: z.string().trim().min(1, 'Enter a page title.').max(300).default('Celebrate beautiful yards'),
  introduction: text.default("Beginning in April 2026, the Yard of the Month program recognizes Cypressdale neighbors who go above and beyond with their landscaping, curb appeal, and overall care for their homes. It's a fun way to celebrate pride of ownership and keep our community looking vibrant and welcoming."),
  showOverview: z.boolean().default(true), overviewTitle: text.default('Program overview'),
  overviewIntro: text.default('Starting in April 2026, each month (season and weather permitting), one Cypressdale home will be selected for outstanding front yard appearance. The winning yard will be recognized on the HOA website and through Cypressdale social media announcements.'),
  overviewSelection: text.default("Selections are made by representatives designated by the HOA. The aim isn't perfection, but neighbors who clearly put care and creativity into their landscape."),
  eligibility: z.array(text).max(20).default(['All occupied homes in good standing are eligible.', 'No sign-up is required to be considered.', 'Yards are viewed from the street (front yards only).']),
  showCriteria: z.boolean().default(true), criteriaTitle: text.default('How winners are chosen'),
  criteriaIntro: text.default('Exact details may evolve, but selections generally consider:'),
  criteria: z.array(z.object({ title: text, description: text })).max(20).default([
    { title: 'Overall curb appeal', description: 'a tidy, inviting yard that enhances the street.' },
    { title: 'Maintenance', description: 'mowed lawn, trimmed shrubs, and healthy plants.' },
    { title: 'Plant selection', description: 'use of color, seasonal interest, or thoughtful plant choices.' },
    { title: 'Creativity & harmony', description: 'decor and design that fit the home and neighborhood.' },
  ]),
  criteriaNote: text.default('The HOA may adjust criteria, schedule, or recognition details over time as the program grows.'),
  currentTitle: text.default('Current Yard of the Month'), pastTitle: text.default('Past winners'),
  emptyBadge: text.default('First selection coming April 2026'), emptyTitle: text.default('Yard of the Month launching April 2026'),
  emptyCopy: text.default('The program is being finalized. Check back after the first selection month to see featured yards from around Cypressdale.'),
  showPast: z.boolean().default(true),
  contactTitle: text.default('Questions about the program?'),
  contactCopy: text.default('For general questions about Yard of the Month, please contact the HOA using the general email address:'),
}).strict();
export const holidaySettingsSchema = z.object({
  ...common,
  pageTitle: z.string().trim().min(1, 'Enter a page title.').max(300).default('Christmas & Holiday Decorating Contests'),
  introduction: text.default('Cypressdale is launching annual holiday decorating contests, starting with the Christmas 2025 contest. The most festive and creative homes will be recognized with awards and featured on the HOA website.'),
  scheduleCopy: text.default('The Christmas contest begins in 2025. A Halloween decorating contest will be added starting in 2026.'),
  displayHoliday: z.enum(['christmas', 'halloween']).default('christmas'),
  prizes: z.array(z.number().min(0).max(100000)).length(4).default([75, 50, 25, 25]),
  emptyTitle: text.default('Christmas decorating winners will be posted here.'),
  emptyCopy: text.default('After judging, 1st\u20134th place homes will be announced and featured on this page.'),
  showShoutouts: z.boolean().default(true), shoutoutsTitle: text.default('Shout-outs: Great Decorations'),
  showMaps: z.boolean().default(true), mapsTitle: text.default('Neighborhood judging sections'),
  mapsCopy: text.default('Cypressdale is divided into four sections so judging can be organized and every home is considered.'),
  mapLabels: z.array(text).length(4).default(['Section 1', 'Section 2', 'Section 3', 'Section 4']),
  mapImages: z.array(image).length(4).default([null, null, null, null]),
  contactTitle: text.default('Questions about holiday contests?'),
  contactCopy: text.default('If you have questions about the contest or need clarification, please contact the HOA:'),
}).strict();
export type YardSettings = z.infer<typeof yardSettingsSchema>;
export type HolidaySettings = z.infer<typeof holidaySettingsSchema>;
export function programSettings(program: Program, value: unknown) {
  const schema = program === 'yard' ? yardSettingsSchema : holidaySettingsSchema;
  const parsed = schema.safeParse(value || {});
  return parsed.success ? parsed.data : schema.parse({});
}
export function formatWinnerMonth(month?: string) {
  if (!month || !/^\d{4}-\d{2}/.test(month)) return '';
  const date = new Date(`${month.slice(0, 7)}-01T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'long', year: 'numeric' }).format(date);
}
