import { z } from 'zod';

export const EventSchema = z.object({
  _id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});
export type Event = z.infer<typeof EventSchema>;
