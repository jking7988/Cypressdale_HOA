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

## Event comments

- There is a “Leave a comment” form on each upcoming event card under the Events page. Comments are persisted as `eventComment` documents in Sanity, so the board can review questions within the Studio.
- No extra configuration is required beyond the existing `SANITY_WRITE_TOKEN`, but make sure that token has permission to create documents (it already does for RSVPs).
- The Team Notes board now mimics a cork wall with each note styled like a sticky. You can customize the cork texture by setting `NEXT_PUBLIC_TEAM_NOTES_CORK` to a URL (or keep the default gradient).  
- Admin users can also purge a comment from the thread by enabling `NEXT_PUBLIC_ENABLE_ADMIN_DELETE=1` and providing the delete passphrase when prompted; the API checks `EVENT_COMMENT_DELETE_SECRET` (or falls back to `NEWS_DELETE_SECRET`) before removing the Sanity document, so keep that secret safe.

## Admin news delete

- When you need the delete button on each news card, set `NEXT_PUBLIC_ENABLE_ADMIN_DELETE=1` so the control appears. Remove that flag when you want to hide the delete UI for regular visitors.
- `NEWS_DELETE_SECRET` secures the deletion API. When the button is clicked you’ll be prompted for that passphrase; the route rejects requests that don’t present the matching secret, so keep it secret and store it server-side (it is read-only and is already used to guard the client/delete flow).

## Resident map pins

- The homepage now includes a live "Community Yard Sale Map" section where residents can submit address, hours, and optional details.
- Data is stored in Supabase table `resident_map_entries` through `GET/POST /api/resident-map`.
- Geocoding is handled server-side. If `GOOGLE_MAPS_GEOCODING_API_KEY` is set, Google Geocoding is used first (recommended for address accuracy); otherwise it falls back to OpenStreetMap Nominatim.

Create the table in Supabase SQL editor:

```sql
create table if not exists public.resident_map_entries (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  hours text not null,
  details text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists resident_map_entries_created_at_idx
  on public.resident_map_entries (created_at desc);
```
- Public map page: `/map` (shareable and QR-friendly). Scanning the QR opens this page.
- Each pinned address now includes direct links to open in Google Maps or Apple Maps.
