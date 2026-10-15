export type SidebarSettings = {
  showRightSidebar?: boolean;
  showCalendar?: boolean;
  showNewsletterSignup?: boolean;
};

export function sidebarOptions(kind: string, settings: SidebarSettings) {
  // Older event pages bundled Calendar and signup under one sidebar setting.
  const legacyEventSidebar = kind === 'event' && (settings.showRightSidebar ?? true);
  return {
    community: settings.showRightSidebar === true,
    calendar: settings.showCalendar ?? legacyEventSidebar,
    newsletter: settings.showNewsletterSignup ?? legacyEventSidebar,
  };
}
