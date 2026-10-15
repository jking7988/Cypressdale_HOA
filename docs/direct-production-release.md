# Direct Production Release

The owner approved replacing the existing live version directly. A separate staged
deployment and keeping the old website available are no longer requirements. Do not
delete the Vercel project, detach its domain, reset the database, or rerun successful
schema/content imports.

## Completed Data Cutover

- The existing hosted project contains 48 content records, 62 assets, 57 file links,
  five comments and three RSVPs, matching the prepared import.
- The retained real account is confirmed and has approved admin privileges.
- All 62 physical files were uploaded create-only and verified by downloaded SHA-256.
- The 31 existing subscribers and 83 legacy history entries remain. New hub mailing
  history is empty. No campaign was sent during migration.
- Private transfer packages and receipts remain git-ignored in `.deployment/`.

## Before the Production Push

Set these in the EXISTING Vercel project's Production environment, retaining its
current Supabase URL/service key, the same project's anon/publishable key, provider
credentials, existing weather/maps keys and Auth SMTP setup:

```dotenv
MEMBER_HUB_ENABLED=true
MEMBER_HUB_ENVIRONMENT=production
MEMBER_HUB_PRODUCTION_READY=true
MEMBER_HUB_SITE_URL=https://cypressdalehoa.com
NEWSLETTER_DELIVERY_ENABLED=false
NEWSLETTER_PRODUCTION_DELIVERY_READY=false
```

Do not leave old hub-specific credential overrides pointing to local Docker or a
different project. Do not copy a service-role key into an anon/public key variable.

Run `scripts/migration/retire-chat-access.sql` once in the existing project's SQL
editor. It revokes old message-table client grants and prevents client access to
the retired chat bucket, without deleting messages/files or blocking hub storage.
It preserves the managed storage triggers and unrelated bucket policies.

Old UUID newsletter confirmation URLs now return a renewal page, not an automatic
subscription mutation. Old email-only unsubscribe links request a new secure link.
Already verified subscribers do not need to sign up again.

## Publish and Check

Run the backend/migration/browser checks, typecheck and production build locally.
Never run test fixtures or seed commands against production. Inspect the release
changes for private exports/credentials before committing and pushing the release
to the existing Vercel production branch. Do not force-push.

After Vercel reports Ready, inspect the production build/runtime logs and verify:

- Home, News, Events, Documents, YOTM, Christmas and Halloween load, including files.
- Owner login at `/admin-sign-in` works and the admin directory is restricted.
- Member-only content remains inaccessible while signed out.
- New invitations, password reset and verification callbacks use `/auth/confirm`;
  test only with explicitly approved real addresses. No production test fixtures.
- Newsletter delivery remains off until its sender/key and a permitted test send
  are verified. Auth SMTP is independent of this newsletter switch.

The production dependency audit is clean; the remaining development/build-tool
advisories remain documented in `production-configuration.md`. Deployment success
does not itself establish successful real SMTP delivery or every authenticated flow.
