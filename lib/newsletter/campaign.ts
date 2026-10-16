import { z } from 'zod';

export const newsletterSendRequestSchema = z.object({
  settingsVersion: z.number().int().min(0).optional(),
  overrideDailyLimit: z.boolean().default(false),
  resendRequestId: z.string().uuid().optional(),
}).strict().superRefine((input, context) => {
  if (input.overrideDailyLimit !== !!input.resendRequestId) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'An explicit resend requires a unique request ID.' });
  }
});

export function newsletterCampaignKey(scope: string, day: string, resendRequestId?: string) {
  // A resend token stays idempotent even if its retry crosses midnight.
  return resendRequestId ? `${scope}:resend:${resendRequestId}` : `${scope}:${day}`;
}
