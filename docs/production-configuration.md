# Production Configuration and Security

For the owner's approved direct replacement of the live site, follow
[direct production release](direct-production-release.md). The staged deployment
section below is an optional earlier approach, not a current release requirement.

Implemented in the migration worktree only. No Vercel settings, hosted Supabase
settings, credentials, DNS records, domains or deployments were changed.

## Connection Gates

Use `.env.member-hub.production.example` as a reference for Vercel's Production
environment. It is NOT an automatically loaded environment file and contains no
credentials. Keep both `MEMBER_HUB_ENABLED` and `MEMBER_HUB_PRODUCTION_READY` false
until the reviewed schema, data transfer and account setup pass. The owner has
explicitly waived further backup work; it is not a launch prerequisite.

Production reuses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from
the current project. It also needs that same project's existing anon/publishable
key, either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
The old website environment file does not currently include that public key. Get
it from the existing project's API settings; never substitute the service key.
Hub-specific credential variables remain supported, but must target the same
production origin. No replacement database or new API credential is required.

Production requires an HTTPS Supabase project URL, an HTTPS canonical
`MEMBER_HUB_SITE_URL`, and the explicit launch gate. A different project URL,
malformed URL, unsafe site origin, or a Vercel Preview/Development deployment is
rejected. Server/proxy session cookies use HttpOnly, SameSite=Lax and Secure for
hosted environments. Local mode remains loopback-only and never borrows existing
production service credentials.

Auth confirmations, invitations and password resets share the validated site
origin. Credential-bearing URLs, paths, queries and fragments are rejected.
Configure the hosted Auth Site URL and `/auth/confirm` redirect allowlist to match;
copy the Auth templates from `supabase/templates/` and verify each flow.

## Email Gates

Auth email and newsletters are different configurations. Setting `RESEND_API_KEY`
in Vercel does NOT configure Supabase Auth SMTP. The owner must configure and test
custom SMTP in the existing Supabase project before real invitations/resets.
[Supabase SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp).

Local mode always captures messages in Mailpit. Hosted newsletter delivery
requires `NEWSLETTER_DELIVERY_ENABLED=true`, the provider key and an explicit
`NEWSLETTER_FROM`. It defaults to `NEWSLETTER_DELIVERY_MODE=test` and requires
`NEWSLETTER_TEST_RECIPIENTS`, a comma-separated tester allowlist. The older
`NEWSLETTER_STAGING_RECIPIENTS` remains a compatibility fallback.

Unrestricted newsletter delivery additionally requires mode `live` and
`NEWSLETTER_PRODUCTION_DELIVERY_READY=true`. Vercel Preview/Development deployments
cannot use production mode or live delivery. No launch or delivery flags were
enabled as part of this work.

Test recipients must also be active, verified subscribers. Other delivery jobs
are skipped without attempting a provider call. Test/live campaigns have different
keys and deduplication scopes; test allowlists also have a fingerprint in the key.
Consequently test sends cannot consume a live campaign's completion marker or
turn leftover test jobs into a live mailing.

The existing Resend key is present locally, but a read-only domain lookup returned
HTTP 401. This does not establish whether the key can send, is restricted or is
stale. Domain verification remains unconfirmed; verify the existing key/domain in
the provider dashboard and explicitly approve a tester delivery before launch.
No real email was sent during this check.

## Scheduler

Scheduled requests accept `Authorization: Bearer <CRON_SECRET>`, the standard
Vercel cron header. `NEWSLETTER_CRON_SECRET` remains supported for other schedulers;
if both variables are supplied, they must be identical or authorization fails.
Use a strong random secret and never put it in query strings or public variables.
[Vercel cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

`vercel.json` currently retains the existing daily `0 12 * * *` schedule. It has
NOT been switched to ten-minute invocations. The application gates scheduled sends
to Friday in America/Chicago; reliable batch retries still require a scheduler
with the intended invocation frequency. Confirm the Vercel plan supports that
frequency or use a separately approved external scheduler. Disable the old sender
before enabling the new one. Do not run both against the same contacts.

## Staged Deployment

An ordinary Vercel Preview deployment is deliberately refused production database
access. For the SAME-project rollout, after schema/data and credential gates pass,
use a protected staged **Production-environment** deployment without domain
assignment, then verify it before promotion. Vercel documents
`vercel --prod --skip-domain`, followed by an explicit promotion.
[Vercel staged production deployment](https://vercel.com/docs/cli/deploying-from-cli).

Do not run those commands yet. First verify the linked project and deployment
protection, keep newsletter delivery off/test-only, and account for email callbacks
using the canonical domain that still serves the old deployment. Such a staged
deployment is connected to real data: skip-domain is NOT data isolation. Carefully
coordinate Auth redirect testing and scheduler behavior before promotion.

## Dependency and HTTP Hardening

Updated Next.js and its ESLint configuration to 16.4.1, PostCSS to 8.5.30 and ESLint
to 9.39.5, followed by compatible audit fixes. No forced major framework, React or
Tailwind migration was performed. Next's verified 16.4.1 release includes security
fixes. [Maintainer release](https://github.com/vercel/next.js/releases/tag/v16.4.1).

The audit now reports zero production-dependency vulnerabilities. The full audit
still reports 9 development/build-tool findings (7 high, 2 moderate), rooted in
the current Tailwind 3/ESLint dependency graph, including `braces` and
`postcss-selector-parser`. The available forced resolution changes major tooling
versions. These remain an explicit review item, not a claim of a clean full audit.
Next still supports the existing React 18 version but warns of future deprecation;
React 19 and a Tailwind major upgrade are separate compatibility work.

All routes now return `X-Content-Type-Options: nosniff` and
`X-Frame-Options: SAMEORIGIN`. Same-origin editor previews continue to work. Existing
private API/session no-store behavior remains in place; no blanket CSP was added
that would break editor scripts, images or embedded maps.

```powershell
npm audit --omit=dev
npm audit
npm run typecheck
npm run member-hub:test
npm run migration:test
npm run build
npm run member-hub:e2e
```

The optimized build was exercised without hosted credentials/launch flags. This
does not establish that the hosted schema, production login or actual SMTP are
configured. Those are still cutover checks.
