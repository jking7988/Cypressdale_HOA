# Cypressdale HOA

Next.js, React, Tailwind and Supabase. Public content, protected files, accounts,
admin editing, discussions, RSVPs and newsletters use the member-hub backend.
There is no CMS Studio or external CMS connection in this application.

Work is isolated in `Cypressdale_HOA-member-hub` on `feature/member-hub`.
The existing production site on `main` has not been changed or redeployed.
The existing-project production cutover still needs to be configured and verified.

## Local Development

Use Node.js 22.18+ and Docker Desktop. From the migration worktree:

```powershell
npm ci
npm run member-hub:start
npm run member-hub:seed
npm run member-hub:dev
```

- Website: http://localhost:3001
- Admin login: http://localhost:3001/admin-sign-in
- Captured test emails: http://127.0.0.1:55424
- Local-only admin: `admin@cypressdale.test` / `CypressdaleLocal2026!`

The launcher reads credentials from the isolated local Supabase stack. Never copy
production credentials into local testing. Seeding preserves existing accounts.
To stop database containers without deleting data, run `npx supabase stop`.

See [local setup and administration](docs/member-hub-local-testing.md),
[migration status and rollout](docs/member-hub-migration.md), and
[newsletter testing and delivery](docs/newsletter-migration.md).
See [production configuration](docs/production-configuration.md) and the
[existing-project cutover plan](docs/production-cutover.md) before any hosted changes.

## Project Structure

- `app/(site)`: public website and original content URLs.
- `app/(hub)`: admin tools, account pages, and protected content.
- `app/api`, `app/auth`: authorized APIs and email callbacks.
- `components/content`: public page renderers shared with live previews.
- `components/member-hub`: admin editing and account controls.
- `lib/member-hub`, `lib/newsletter`: backend access and application logic.
- `public/images`: existing static website images and judging maps.
- `supabase`: database migrations and Auth email templates.
- `scripts/member-hub`, `tests/member-hub`: local tools and regression tests.
- `scripts/migration`: offline archive import/verification, not a live CMS connection.
- `backups`: ignored private archives. Do not commit, publish, or delete them.

The standalone Portable Text editor/renderer retains existing rich-text formatting.
Its internal schema utilities are not a CMS service or Studio installation.
Legacy IDs and attachment references are preserved to keep existing links intact.
The retired Board/Team Chat tool is not part of this hub; a new notes/collaboration
area is future work. Homeowners is also a placeholder, separate from admin access.

## Verification

```powershell
npm run typecheck
npm run member-hub:test
npm run migration:test
npm run member-hub:e2e
npm run build
```

Browser tests require the local Docker stack and development server. They create
their own fixtures and preserve accounts/content entered by testers.

## Optional Website Integrations

`SPECTRUM_CONTACT_EMAIL` controls the shared contact inbox. The optional yard-sale
map uses `NEXT_PUBLIC_YARD_SALE_MAP_ACTIVE=1` and the existing
`resident_map_entries` Supabase table. Its backend/data rollout is separate from
content migration. Google geocoding is optional via `GOOGLE_MAPS_GEOCODING_API_KEY`;
otherwise it uses OpenStreetMap. Configure `RESIDENT_MAP_DELETE_SECRET` for map
deletion; the existing shared-secret fallback is retained for compatibility.
Removal-request notifications use `RESIDENT_MAP_NOTIFY_TO`.

Newsletters use verified subscribers and the account-authenticated admin tools.
Local delivery is captured in Mailpit. Hosted staging requires an explicit test
recipient allowlist; production delivery remains disabled until cutover.
Scheduling uses a bearer `CRON_SECRET` (or matching `NEWSLETTER_CRON_SECRET`), not a CMS webhook secret.
