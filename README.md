# Cypressdale HOA — Next.js + Sanity + Tailwind

## Prereqs
- Node.js 18 or 20 (LTS)
- VS Code recommended

## Setup
```bash
npm install

# Initialize or link a Sanity project (choose output path: ./sanity when prompted)
npm create sanity@latest -- --project "Create new" --dataset production --template clean --output-path sanity
```

Create `.env.local`:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
```

## Run
```bash
npm run dev
# App: http://localhost:3000
# Studio: http://localhost:3000/studio
```

## Newsletter webhook

- Add `NEWSLETTER_WEBHOOK_SECRET` (a secret string you control) to the environment so the webhook can be verified.
- Create a Sanity webhook that forwards relevant document updates (news posts, events, or other pages you care about) to `https://<your-domain>/api/newsletter/webhook?secret=<secret>`.
- The webhook only needs to POST an empty body; updates are deduplicated on the Next.js side, so the newsletter will only send when new or updated content exists.
- To prevent duplicate emails when multiple documents change in a single day, the newsletter now runs on a once-daily cron (`/api/newsletter/send` is executed by Vercel every day at 12:00 UTC). Keep the webhook if you still want to trigger a manual check, but rely on the scheduled job for the daily send.
- Make sure `NEWSLETTER_SITE_URL` points to the public Cypressdale HOA domain (e.g., `https://cypressdalehoa.com`). That value is now the canonical base URL used inside outgoing emails, so the newsletter links resolve to the HOA site instead of the Vercel project hostname.
- All contact links now share a single Spectrum-managed inbox. Set `SPECTRUM_CONTACT_EMAIL` (default: `cypressdalehoa@spectrumam.com`) in each environment so the general/board/management/pool sections all point at the same address.
