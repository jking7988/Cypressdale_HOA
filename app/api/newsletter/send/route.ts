import { sendNewsletterRoute } from '@/lib/newsletter/routes';
export const runtime = 'nodejs';
export const maxDuration = 120;
export async function GET(request: Request) { return sendNewsletterRoute(request); }
export async function POST(request: Request) { return sendNewsletterRoute(request,true); }
