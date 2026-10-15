# Newsletter Migration

Implemented in the isolated `feature/member-hub` worktree, not production.
Newsletter subscriptions are independent of admin accounts; the Homeowners page
is still a placeholder with no connected account backend.

## Backup and Import

The read-only source export contains 31 subscribers and 83 historical send dates.
Private backup files live under ignored `backups/newsletter-*/`, with SHA-256
manifests. Verification credentials and source API keys are never exported.
Subscribers retain their existing active/verified consent flags; new management
tokens are generated locally. Historical sends are archived, not mixed into local
delivery jobs. Source tables were not changed and no real email was sent.

```powershell
# Reimport the latest verified backup without overwriting local changes:
npm run newsletter:import
# Take another read-only source snapshot and import into local Supabase:
npm run newsletter:import -- --source-env ../Cypressdale_HOA/.env.local
```

The importer accepts only the dedicated local destination on port 55421. Duplicate
emails are skipped, preserving subsequent local unsubscribe choices. Take a fresh
export at cutover and reconcile consent changes before enabling production delivery.

## Local Testing

Open `/admin/newsletter` to preview and send the current public digest to Mailpit.
The separate `/admin/subscribers` page lists names, emails, streets, status and
record creation dates. Admins can search, filter subscribed/unconfirmed/unsubscribed
records, refresh the directory and remove a subscriber after explicit confirmation.
Removal deletes the newsletter contact record, not the person's HOA account.
Confirmation/unsubscribe tokens are never included in directory responses.
Removed email hashes are retained privately to prevent old backups from restoring
deleted subscribers. A fresh public signup can create an unconfirmed subscription;
reactivation still requires the mailbox owner's confirmation.

The existing public signup form sends a confirmation email to
`http://127.0.0.1:55424`. Open its link and press Confirm subscription.
Confirmation tokens are hashed, single-use and expire after 24 hours.
Requests are rate-limited to one per address per minute and 30 globally per minute.

Submitting an existing email never silently reactivates an unsubscribed address
or changes its stored profile. Resubscription requires another confirmation.
`POST /api/newsletter/manage` sends an email link for unsubscribe/resubscribe;
it does not change consent using an email address alone. Newsletter footer links
open an unsubscribe confirmation page. GET does not change consent; POST with the
secret token does, including email-provider one-click unsubscribe requests.
Unsubscribe also invalidates outstanding confirmation tokens.

The digest uses only published public news and upcoming event dates, including
the next future date of a two-date event. Titles are HTML-escaped; links use
existing ID-based routes, not unimplemented slug routes. Private titles, files and
drafts cannot enter the digest. Public content and subscriber consent are checked
again immediately before each delivery. If a campaign snapshot changes, sending
pauses instead of sending stale content.

## Scheduling and Retries

Local mode always captures via Mailpit's HTTP send API, regardless of inherited
Resend settings. Hosted staging requires `NEWSLETTER_DELIVERY_ENABLED=true`, a
Resend key and an explicit `NEWSLETTER_STAGING_RECIPIENTS` allowlist. All other
recipients are rejected. Production has separate connection and delivery gates,
both off by default; see [production configuration](production-configuration.md).

Admin-only `POST /api/newsletter/send` sends the current digest. Scheduled
`GET /api/newsletter/send` and `POST /api/newsletter/webhook` require
`Authorization: Bearer <CRON_SECRET>` (or the matching `NEWSLETTER_CRON_SECRET`); query-string secrets and public
force-send requests are not accepted. Scheduled sends run only on Fridays in
America/Chicago, and skip unchanged content. Configure a scheduler to invoke the
protected endpoint every 10 minutes; the backend applies the Central-time gate.
No local or production scheduler was installed by this migration.

Only one campaign per delivery scope/Central-calendar day is created. Hosted test
and live scopes are separate, and test allowlists have their own fingerprint.
Recipient jobs
have unique campaign/subscriber pairs, transactional claims and five-minute leases.
Completed deliveries are not resent; inactive subscribers are skipped. Requests
process small batches for up to 20 seconds and report remaining jobs; repeat the
same admin command or scheduler request to finish pending jobs. Errors are stored
per delivery and never counted as successful sends.

Resend uses stable per-delivery idempotency keys. Automatic retries stop after
five attempts and outside a 23-hour safety window; review provider receipts before
manually recovering an old failed campaign. Mailpit does not support provider-side
idempotency: a process crash after capture but before saving its receipt can create
a duplicate local test email on recovery. Database claims prevent concurrent normal
requests from duplicating deliveries.

Account deletion optionally unsubscribes the matching address and clears its
newsletter name/street in the same database transaction as Auth removal. Last-admin
rejection rolls back newsletter changes as well. If not selected, the independent
newsletter subscription retains its existing consent.

Before production: verify the sending domain/provider, configure scheduler secrets,
apply schema in hosted staging, exercise real delivery with allowlisted testers,
and reconcile a fresh subscriber export. Studio and CMS integration have been
removed from the migration worktree; hosted staging and final production cutover
remain separate steps. The webhook-named endpoint is only a bearer-authenticated
scheduler compatibility route, not a connection to an external CMS.
