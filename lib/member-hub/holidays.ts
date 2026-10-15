export type Holiday = 'christmas' | 'halloween';
export const holidayPages = {
  christmas: { label: 'Christmas', title: 'Christmas Decorating', id: 'program-holiday-decorating', publicPath: '/holiday-decorating/christmas', adminPath: '/admin/holiday-decorating/christmas' },
  halloween: { label: 'Halloween', title: 'Halloween Decorating', id: 'program-halloween-decorating', publicPath: '/holiday-decorating/halloween', adminPath: '/admin/holiday-decorating/halloween' },
} as const;
export function isHoliday(value: string): value is Holiday { return value === 'christmas' || value === 'halloween'; }
export function winnerHoliday(value: unknown): Holiday {
  return String(value || '').trim().toLowerCase().includes('halloween') ? 'halloween' : 'christmas';
}
export function holidayDefaults(holiday: Holiday) {
  return holiday === 'halloween' ? {
    displayHoliday: 'halloween', pageTitle: 'Halloween Decorating Contest',
    introduction: 'Celebrate the creativity of Cypressdale neighbors with Halloween decorations and community recognition.',
    scheduleCopy: 'Contest details and judging dates will be posted here.',
    emptyTitle: 'Halloween decorating winners will be posted here.',
  } : {};
}
