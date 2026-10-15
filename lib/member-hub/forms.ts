import { z } from 'zod';

export const emailSchema = z.string().trim().email('Enter a valid email address.').max(320).transform(value => value.toLowerCase());
export const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128, 'Use no more than 128 characters.');
export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name.').max(200),
  address: z.string().trim().min(5, 'Enter your Cypressdale address.').max(500),
});

export function safeHubRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/members';
  const url = new URL(value, 'http://localhost');
  if (!['/members', '/reset-password', '/members/accept-invite'].includes(url.pathname)) return '/members';
  return `${url.pathname}${url.search}`;
}

export type HubActionResult = { error?: string; success?: string; redirect?: string };
export type DirectoryMember = {
  id: string; full_name: string; address: string; email: string; role: 'admin' | 'resident';
  membership_status: 'pending' | 'approved' | 'revoked'; email_confirmed_at: string | null; created_at: string;
};
export type AdminInvitation = { id: string; email: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; created_at: string };
