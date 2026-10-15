# Existing-Project Production Cutover

## Requirements

Use the existing Vercel project and existing hosted Supabase project with its
current credentials. Do not provision a replacement database or reset either
database. Preserve all locally entered content, winners, page settings, drafts,
documents, folders, asset IDs and relationships. Only the known local test admin
is a candidate for exclusion; no other account or record is presumed disposable.

## Read-Only Audit, October 14, 2026

The audit used the existing website's local environment file in memory. No keys,
email addresses, resident names or content bodies were printed. No hosted writes,
emails, migrations or deployments were performed.

Local inventory:

- 48 content records, including 11 marked locally edited.
- 6 published YOTM winners for 2026 and 5 Christmas winners for 2025.
- 25 published document records and 3 published folders.
- 4 published events, 2 event drafts, and 3 published pages/settings records.
- 62 assets: 38 Files and 24 Documents; all stored bytes match their SHA-256
  checksums and recorded sizes, totaling 54,285,588 bytes.
- 57 recorded content/asset relationships; no broken foreign-key relationships.
- 5 comments and 3 RSVPs.
- 2 accounts: the known local test admin and one other account to preserve.
- 31 local subscribers, 1 local campaign and 24 delivery records. Mailpit delivery
  history must remain archived as local history, not count as real deliveries or
  become pending production jobs.

Hosted API inventory:

- 31 newsletter subscribers and 83 historical newsletter runs.
- 0 resident-map entries and 0 Auth accounts at the time of the audit.
- Exposed tables: `messages`, `newsletter_subscribers`, `newsletter_runs`,
  `resident_map_entries`. Existing message rows are out of scope for deletion.
- Existing `chat-uploads` bucket: preserve it, even though Team Chat is retired.
- The `hoa_*` tables are not exposed by the hosted API. This is not proof of
  absence from every schema; complete the SQL catalog check before migrations.

Audit receipts, counts, migration checksums and asset verification results are
under ignored `backups/production-audit-*/report.json`. **These are metadata reports,
not recoverable backups or transactionally consistent snapshots.** Repeat the
audit after any further editing and at final cutover.

```powershell
node scripts/migration/production-audit.mjs --source-env ../Cypressdale_HOA/.env.local
npm run migration:test
```

The audit transport uses GET only, refuses cross-origin requests and redirects,
does not seed users, and does not initialize the app's production guard.

## Confirmed Migration Conflict

Do not run `supabase db push` against the existing project yet.

Migration `202610140005_rsvp_newsletter.sql` creates `newsletter_subscribers` and
`newsletter_runs`, both of which already exist on the hosted project. Their schemas
also differ: hosted subscribers have `verification_token`; the hub expects hashed
confirmation tokens, pending profile fields and unsubscribe tokens. Hosted runs
contain only `id` and `sent_at`; hub campaigns require a run key, transport and
payload. Blindly replaying the local migration chain would fail.

Prepare and rehearse a compatibility rollout after reviewing hosted constraints:

1. Keep existing subscriber IDs, consent, profile fields and historical runs.
2. Prefer additive subscriber changes that remain compatible with the currently
   deployed site's reads and writes. Plan handling of outstanding email links.
3. Keep the existing history ledger compatible with the old sender; use a separate
   namespaced campaign ledger if needed rather than imposing new required columns
   that would break its inserts before cutover.
4. Reconcile subscribers by normalized email, not local UUID. Never overwrite a
   newer unsubscribe with an older local import or silently reactivate a contact.
   Preserve removal tombstones as well as active records.
5. Do not edit already-applied local migration history as a shortcut. Rehearse the
   same-project upgrade using a separate disposable local database populated with
   the existing schema, not by resetting the user's working Docker stack.

## Catalog Review Received

The owner supplied the complete `catalog_review` result on October 14, 2026.
It has been retained privately under `backups/production-catalog-*/catalog.json`.
The query in `scripts/migration/production-catalog-review.sql` remains available
for rechecking immediately before rollout. It uses a read-only transaction and
selects schema metadata only, not content, emails, Auth credentials or function bodies.

The supplied catalog confirms:

- Only `public` exists among the reviewed application/migration schema names; no
  existing `hoa_private` or `supabase_migrations` schema was reported.
- `newsletter_runs.id` is a sequence-backed bigint, not a UUID. Its 83 historical
  rows must not be cast into or replaced by the hub's UUID campaign ledger.
- `newsletter_subscribers.id` is UUID, `email` is uniquely indexed, and the old
  `verification_token` is nullable text. Existing `active` defaults to true and
  `verified` to false. New confirmation fields can be additive, but default and
  compatibility behavior must be tested against the old site's writes.
- There are no reported application functions or Auth signup/delete triggers to
  collide with the proposed hub functions/triggers. Storage has managed triggers;
  those must remain untouched.
- RLS is disabled on subscribers, newsletter history and resident-map entries.
  Effective API exposure depends on grants, which were not included in this query.
  Review privileges and close unintended access as a launch requirement.
- The retired `messages` table has permissive policies for anonymous/public read,
  insert, update and delete. `chat-uploads` has similarly broad storage policies.
  Retire that access after verifying no active clients depend on it, retaining
  stored rows and files rather than deleting them. RLS-enabled alone does not
  mean this data is protected by the present policies.

This checks existing tables/columns/defaults, constraints, RLS policies, function
signatures, and triggers including those on Auth and Storage. The existing service
key is sufficient for the API inventory but is not a direct PostgreSQL credential.
No direct database password or Supabase management access was present in the
website environment file. Historical migration/grant configuration still needs
review before the deployment package can be finalized.

## Local Recovery Backup Captured

`node scripts/migration/backup-local.mjs` created a private preproduction backup
under `backups/local-preproduction-2026-10-15T00-37-13-704Z/`:

- `database.dump`: PostgreSQL custom-format dump, including content, profiles,
  Auth, comments, RSVPs, newsletters, private retirement/contact data and storage
  metadata. The source transaction is read-only.
- `storage.tar.gz`: all 62 files in the local Storage backend mount.
- `manifest.json`: archive sizes, SHA-256 checksums, verification scope and limits.

Archive readability, required table-data entries, nonempty storage and file
checksums were verified at capture. The subsequent recovery rehearsal is documented
below. Database and storage were captured sequentially, so this is not a coordinated cross-service snapshot.
Repeat under an edit/upload freeze for the final transfer.

The dump contains sensitive Auth and subscriber data, including the known test
identity and local newsletter history. Keep it ignored/private. It is a recovery
backup, not a script to restore blindly into the hosted production database.
No hosted backup is included. Cluster roles and environment secrets are excluded.

```powershell
node scripts/migration/backup-local.mjs
npm run migration:test
```

## Compatibility Candidate Prepared

`node scripts/migration/prepare-existing-project.mjs` generates an OFFLINE candidate
under ignored `.deployment/existing-project-baseline-*/` (older candidates remain
under `backups/`). It does not accept credentials,
connect to a database, or execute SQL. Its manifest explicitly says
`productionReady: false` and lists the outstanding rollout gates.

The candidate adapts the reviewed 13-migration chain without modifying the original
applied migration files:

- Existing `newsletter_subscribers` remains the single contact/consent table.
  Additive fields support pending profiles, hashed confirmations and unsubscribe
  tokens. Existing IDs, fields, consent, timestamps and legacy tokens stay intact.
- Existing `newsletter_runs` and its bigint sequence remain the old history ledger.
  The new UUID ledgers are `hoa_newsletter_runs` and `hoa_newsletter_deliveries`,
  inside the SAME project. The old service-role sender can still append history.
- Subscribers, old history and new ledgers deny anonymous/ordinary-authenticated
  table access. The old site's service-role routes remain compatible.
- All installation changes share one transaction. Schema drift, unnormalized
  emails, conflicting objects or a repeat installation fail instead of replacing
  data. No subscriber normalization, deletion, import or email delivery is performed.
- Existing messages, resident-map records and chat objects/policies are not changed
  by this baseline. Retiring chat access is a separately reviewed cutover action.

The full candidate is rehearsed in disposable PGlite PostgreSQL instances against
synthetic data with the supplied legacy table shapes and representative Supabase
Auth/Storage schemas and grants. Tests cover retention, old writes, UUID campaigns,
new confirmation consent, restricted access, repeat-install rejection, schema drift
and late-failure transaction rollback. No working Docker or hosted database is
modified by these tests. This is NOT yet a hosted-production rehearsal.

```powershell
node scripts/migration/prepare-existing-project.mjs
npm run migration:test
```

The application selects the new campaign ledger names only for production;
existing local and isolated staging setups retain their current names. This does
not enable production connections or email delivery: no launch flags were set.
Before this candidate can be applied, complete legacy email-link behavior,
production configuration and security upgrades, and rehearse
the actual data/Auth/file transfer and recovery. **Do not run this candidate in the
Supabase SQL editor yet, and do not use `supabase db push` as a substitute.**

## Recovery and Real-Data Transfer Rehearsed

Recovery receipt: `backups/recovery-rehearsal-2026-10-15T00-47-26-468Z/receipt.json`.
The original custom-format dump was restored into a uniquely named disposable
database inside the dedicated local Supabase container. Storage was extracted
into a new ignored recovery directory, never over the working storage mount.
All 62 asset files matched their recovered database SHA-256 hashes and sizes.
The temporary database was removed; the working database was not modified.

This verifies schema/data restoration and physical file bytes. It does not verify
ownership/ACL restoration, booting a restored Auth/Storage service, or a hosted
project disaster recovery. The local restore used `supabase_admin` only inside
the fixed local container because Supabase-managed extension data cannot all be
restored by its ordinary `postgres` role. It is not a hosted restore command.

Real-data transfer receipt:
`backups/transfer-rehearsal-2026-10-15T00-52-43-381Z/receipt.json`.
The rehearsal uses the checksum-verified recovered snapshot, current read-only
hosted subscriber/history snapshots, and a disposable PGlite target. Unrelated
hosted Auth/Storage infrastructure is represented by test fixtures, not cloned.

Verified after candidate schema installation and transfer:

- All 48 content rows, including drafts and program settings, match typed source
  rows exactly, retaining IDs, versions, timestamps, layout JSON and whitespace.
- All 62 asset metadata rows, 57 file relationships, document folder assignments,
  5 comments and 3 RSVPs are retained.
- All private content, asset and subscriber retirement records and legacy contact
  relationships are preserved, preventing old exports from restoring deletions.
- All 31 live subscribers retain their existing IDs, legacy tokens, profile
  details and consent. There are zero consent/profile conflicts, zero additions
  and zero removal candidates for this snapshot. All 83 historical runs match.
- Local Mailpit campaigns/delivery jobs are not imported; the new campaign tables
  remain empty, so local sends cannot be mistaken for production deliveries.
- The known local test identity is excluded ONLY in the rehearsal target. Its
  retained discussion/RSVP authors become User Cleared; no content is removed.
- One non-test account/profile is preserved using an explicitly simulated verified
  target identity. Production still requires inviting/verifying that account and
  mapping its new Auth ID before any actual transfer. No passwords, refresh tokens,
  sessions, or outstanding admin invitations are copied into the transfer plan.

`transfer-model.mjs` deliberately accepts only disposable PGlite instances for
applying the plan. It cannot execute a hosted import. Account mappings, consent
conflicts, missing references, retirement conflicts and previously edited target
content block the transfer rather than being overwritten or guessed. Failure
rolls the rehearsal transaction back, including restoration of enabled triggers.

Private artifacts include the plan, source snapshot checksum, baseline checksum,
hosted newsletter snapshot, and per-asset source-path/checksum transfer manifest.
These contain personal information: do not commit, serve, or paste them publicly.
An asset transfer manifest is not evidence of any hosted upload. The physical
files remain in the local recovery directory.

```powershell
node scripts/migration/rehearse-recovery.mjs --backup backups/local-preproduction-2026-10-15T00-37-13-704Z
# Use the recovery directory printed by that command:
node scripts/migration/rehearse-transfer.mjs --recovery backups/recovery-rehearsal-<timestamp> --source-env ../Cypressdale_HOA/.env.local
npm run migration:test
```

Historical rehearsal receipts remain `productionReady: false`. Current transfer
packaging, guarded SQL generation and opt-in checksum-verifying uploads are now
implemented; see [production transfer](production-transfer.md). Actual hosted
execution, verified account mapping, remaining security review,
legacy email-link compatibility, hosted configuration and Vercel checks still
need to be completed. Repeat these checks against a final edit-freeze snapshot;
the current rehearsal is a point-in-time check, not ongoing synchronization.

## Transfer Gates

The owner explicitly requested skipping further backup work. No new backups or
restore rehearsals are required for the remaining rollout. Existing private
recovery files and historical receipts stay untouched. This is a waived safeguard,
not evidence that hosted recovery is available.

Before any hosted schema change:

1. Export CURRENT local data and storage for the actual transfer.
   Legacy CMS archives alone omit later edits and uploaded winners. Include
   retirement records, legacy contacts, folder assignments and config records.
2. Produce a checksum-verified transfer manifest with source/destination IDs,
   conflict handling, row counts and object hashes. Do not import by title or
   deduplicate winner years; preserve IDs and explicit relationships.
3. Preserve the non-test local account through a reviewed Auth transfer or explicit
   verified identity mapping, including author references. Do not copy the known
   test password, tokens or sessions into production. Removing a test identity must
   not delete content it created or orphan retained discussions.
4. Validate the transfer before applying to the live project. Keep a final
   read-only/edit-freeze window for both sites to avoid transfer races.

Old email-based unsubscribe links now display a request form. Opening them neither
changes consent nor sends mail. Submitting requests a secure link using the existing
rate-limited management RPC; only a subsequent token-confirmed POST unsubscribes.
Older UUID confirmation links still require a fresh signup confirmation and remain
an explicit compatibility item. Existing verified subscriptions do not need to
confirm again. No existing subscriber IDs or tokens are rotated by this change.

## Application and Hosting Gates

- Next.js and compatible dependencies have been patched; the production audit is
  clean. Review remaining build-tool advisories and verify the final build/tests.
  Automated fixtures must never target the hosted project.
- Explicit production connection/email gates, existing-credential fallbacks and
  secure hosted cookies are implemented but not enabled. Configure actual hosted
  variables, redirects and Auth templates using
  [production configuration](production-configuration.md); do not bypass the gates.
- Review custom Auth SMTP separately from newsletter Resend delivery. Restrict
  preview delivery to approved testers; no automatic newsletters during transfer.
- Check Vercel project, production branch, environment scopes, domain, scheduler
  configuration and logs. Those remote settings have not been inspected here.
- Use protected preview testing with tightly controlled writes because the project
  is shared. Avoid leaking private content, creating campaigns or altering consent.
- Disable the old newsletter schedule before enabling the new one. Preserve a
  deployment rollback and data-reconciliation plan; deployment rollback alone
  does not reverse database changes or copy new activity back into the old CMS.
- Switch only after reviewed transfer validation, checks and explicit cutover
  approval. Retire old credentials/services after the rollback window, not before.

No hosted migrations, data transfer, credential changes, Git push, or production
deployment have been performed as part of this audit.
