# Development Against the Hosted Project

The default member-hub development command now uses the SAME Supabase project,
database, storage and accounts as the live site. Docker is not required for this
workflow. UI/code changes run locally and do not publish until a deliberate Git
push triggers Vercel. DATABASE CHANGES ARE NOT ISOLATED: content edits/publication,
uploads/removals, account changes, RSVPs and subscriber edits affect the live site
immediately, without any code deployment. Draft previews remain the normal way to
review content before publishing; they are not a separate test database.

## Start

Keep using your existing ignored `.env.local`. The launcher reads it from the
primary Git worktree automatically, then uses a `.env.local` in the member-hub
worktree as an optional override. No new environment file is required. Reuse the
existing hosted `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and either
`NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never put
the service-role key into the public-key setting or paste credentials into chat.

From `Cypressdale_HOA-member-hub`:

```powershell
npm run member-hub:dev
```

Open http://localhost:3001/admin-sign-in and sign in with your REAL hosted admin
account and password. Do not use the retired Docker test account. Stop another
server on port 3001 first. `npm run member-hub:dev -- --check` validates the
configuration and performs read-only credential/schema checks without starting a
server. Startup never imports, seeds, resets or migrates hosted data.

The dedicated `hosted-development` mode requires Node development mode and loopback
callbacks/cookies. It cannot run on Vercel or in a production build. The launcher
overrides stale Docker credentials, pins the existing project and disables
newsletter delivery by default, even if live sender flags were inherited. Supabase AUTH mail
is different: registration, recovery and invitation requests still affect real
accounts and use the hosted SMTP sender. The current hosted recovery template
returns users to the LIVE site's callback. Do not change Supabase's global Site
URL to localhost. Any separate local-callback email testing requires a deliberate
redirect/template configuration change, not weakening production URL checks.

## Newsletter Test Emails

To explicitly allow real test email from localhost, put
`MEMBER_HUB_NEWSLETTER_TEST_RECIPIENTS=your-approved-address@example.com` in the
ignored worktree `.env.local`, alongside the existing primary-worktree Resend key
and verified `NEWSLETTER_FROM`. This dedicated allowlist is separate from
production flags. Restart `npm run member-hub:dev` after changing environment
variables; code changes hot-reload without a build. Remove the allowlist to
disable sending again. Startup sends no mail.

The launcher forces test-only delivery, rejects missing sender/key/invalid
addresses, strips cron secrets, and cannot enable live/bulk sending. The page shows
Test Recipients Only. Only active, confirmed newsletter subscribers on the local
allowlist can receive a digest; everyone else is excluded. Subscription changes
and customization saves still affect the shared hosted database. This mode is
refused in production builds and on Vercel. Docker/Mailpit testing stays isolated.

## Automated Tests Remain Isolated

Never run fixtures against this shared-data server. Playwright now checks an
isolated-test-only endpoint before executing tests and refuses a hosted-data server.
Leave hosted development running on port 3001. Isolated tests use port 3002 and
their own `.next-isolated` build cache, so the editor never switches databases.
To run automated browser tests, start Docker and use:

```powershell
npm run member-hub:start
npm run member-hub:seed
npm run member-hub:dev:local
# In another terminal:
npm run member-hub:e2e
```

This keeps fixture accounts/uploads and Mailpit messages in Docker. Test
commands and browser tests must never replace the hosted server on port 3001.
Saved drafts persist in the hosted database across browser reloads and server
restarts. Edits marked **Unsaved changes** still require **Save Changes**.
If the Docker stack was already running with the old port-3001 Auth configuration,
restart only the `cypressdale-member-hub` local stack to apply port-3002 redirects.
Seed/import scripts remain local-only. Do not replay migrations or seed the hosted project.
Do not commit `.env.local`, exports, upload receipts or private migration packages.
