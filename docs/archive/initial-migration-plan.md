# Initial Member Hub Migration Plan (Historical)

This is the original discovery record, not current setup instructions. Studio,
preview integration, SDK clients, and the live-export command have since been
retired. Use [current migration status](../member-hub-migration.md) and
[local setup](../member-hub-local-testing.md) instead. Private source/content
archives remain under ignored `backups/`; nothing here should be re-enabled.

## Isolation and deployment

Production checkout: `C:/Users/Josh/Documents/GitHub/Cypressdale_HOA` on `main`.
Migration checkout: `C:/Users/Josh/Documents/GitHub/Cypressdale_HOA-member-hub`
on `feature/member-hub`, based on commit `010da29`.

Keep the production branch and domain in place during development. Use the migration
branch for preview deployments after confirming the Vercel project's production
branch. The Vercel project settings are not available in this local checkout and
have not been changed. No remote branch or deployment has been created yet.

Use a separate Supabase project (or isolated Supabase development branch) for the
preview. The current Supabase project already serves newsletter subscriptions and
resident map entries. A separate code branch alone does not isolate these services.
Do not use its service role key for migration writes or destructive testing.
Use preview-specific Auth redirect URLs, email configuration and storage buckets.
Disable newsletter deliveries and webhooks in preview; use test recipients for
account email. Production Sanity remains read-only to migration tools.

## Agreed account behavior

| Account | Access |
| --- | --- |
| Visitor | Public content |
| Verified resident awaiting approval | Public content and account status |
| Approved resident | Public and member content |
| Revoked resident | Public content and account status |
| Invited admin | Member content, content editing and account management |

Residents register with name, email and address. Email verification and admin
approval are both required for member access. Admin membership is invitation-only;
client input and signup metadata must never assign an admin role or approval.
Enforce permission checks in database RLS, APIs and private storage, including
direct document downloads. Revocation must take effect even with an existing session.

Admins can approve residents, revoke access and remove accounts. Residents can
delete their own account after confirmation and recent authentication. Preserve
comments, reply threads and RSVPs, but remove user links and personal fields and
display `User Cleared` for deleted accounts. Account deletion must also remove
Auth credentials and profile/address data. Revocation retains identity.
Prevent removal of the last active admin, including concurrent deletion attempts.
Offer newsletter unsubscription separately because subscriptions are independent
of member accounts today. Record administrative actions without retaining deleted
resident personal information in audit payloads.

## Current page inventory

| Route | Current source | Migration approach |
| --- | --- | --- |
| `/` | Local layout, Sanity news/events, weather, Supabase map | Preserve layout; replace content queries |
| `/news`, `/news/[id]` | Sanity posts, section layouts, comments | Preserve IDs, layout options and section styling |
| `/events`, `/events/[id]` | Sanity events, sections, flyers, RSVP counts | Preserve IDs, schedule fields and RSVP data |
| `/documents` | Sanity files and folder references | Preserve categories/folders and download attachments |
| `/yard-of-the-month`, `/yard-of-the-month/[id]` | Sanity winners and photo galleries | Preserve IDs and photo order |
| `/holiday-decorating` | Sanity winners, local section maps | Preserve winner fields and local maps |
| `/about`, `/new-residents`, `/pool`, `/trash`, `/local-area` | Local TSX and public assets | Existing pages stay available; expose selected copy/settings in hub later |
| `/map` | Existing Supabase resident map | Keep separate from membership address data |

Local images in `public/` are already versioned and present in the migration
worktree. They do not need to be downloaded from Sanity. There is no current login,
membership system or custom-page route. The `page` schema file exists but is not
registered in the active Studio schema index.

## Compatibility details

### Initial export results (October 13, 2026)

Verified backup: `backups/sanity-2026-10-13T23-38-13-305Z/`.
110 total records, including system records and four drafts. All 52 assets
(25 images and 27 files) downloaded successfully with no unresolved references.

| Content type | Published | Drafts |
| --- | --- | --- |
| Events | 4 | 2 |
| Holiday winners | 5 | 0 |
| Documents | 25 | 0 |
| Document folders | 3 | 0 |
| Comments | 5 | 0 |
| News posts | 0 | 0 |
| Yard winners | 0 | 0 |

Six embedded RSVP entries were found across exported event records. Counts include
both published and draft versions, so import must deduplicate by the source event
ID. No standalone `rsvpResponse` records were present. Two additional drafts are
Sanity preview system records. The absence of news and yard winners reflects this
dataset at export time; it is not a migration deletion.

The first backup attempt is retained for diagnosis; 22 optimized image responses
failed the original-size check. The verified backup above uses original downloads
and supersedes that attempt. The three migration-tool tests and `git diff --check`
passed. No runtime application code or production data has been changed.

### Import constraints

- Preserve raw Portable Text and section JSON on import. First retain the current
  rendering behavior, then introduce an editor that can round-trip the imported
  formatting without loss. Do not convert everything to plain text.
- Current section types include `textSection`, `imageWithText`, and `topicSection`.
  Keep alignment, widths, spacing, colors, borders, image crop/hotspot, alt text,
  layout variant and sidebar settings.
- RSVP submissions currently append to `event.rsvps` and increment counters.
  Older `rsvpResponse` documents are also queried by some pages. Import both forms
  if present; reconcile counters without discarding historical totals.
- `documentFile` has both category strings and folder references in the live data.
  The current schema only exposes categories while page queries expect folders.
  Preserve both during migration and resolve the final folder mapping explicitly.
- Preserve published/draft separation and source `_id`/`_rev` for repeatable imports.
  Never publish drafts automatically. Existing imported content starts public to
  preserve current access; member-only content is explicitly designated by admins.
- Legacy comments and RSVPs are unauthenticated. Do not attach them to a new account
  based solely on a matching submitted email; require proof of ownership or leave
  them as legacy authors. Account deletion clears records with verified ownership.
- Newsletter generation reads Sanity posts/events. Replace those queries and ensure
  member-only titles, excerpts and attachments never enter public newsletters.
- Replace passphrase-based deletion APIs with authenticated admin authorization.
  Retire Sanity draft-mode routes, visual editing and webhooks at final cutover.

## Backup tool

Requires Node.js 20.12+ and a Sanity token with permission to export the dataset.
The script uses GET requests only. It exports all accessible records, including
drafts and asset metadata, without changing Sanity or Supabase.

From a checkout with its own `.env.local`:

```powershell
npm run migration:backup
npm run migration:test
```

From this isolated worktree, use the existing checkout's environment for the
read-only export without copying credentials:

```powershell
node --env-file=C:/Users/Josh/Documents/GitHub/Cypressdale_HOA/.env.local scripts/migration/backup-sanity.mjs
```

Each run creates a new ignored `backups/sanity-<timestamp>/` directory containing:

- `data.ndjson`: raw export, including private records and Sanity system data.
- `inventory.json`: counts, draft count, fields, section types, unresolved references.
- `asset-manifest.json`: original URLs, local paths, sizes and SHA-256 checksums.
- `assets/`: original image and file uploads, using authenticated `dlRaw` downloads.
- `missing-assets.json`: assets needing another attempt or manual recovery.

Downloads must match recorded sizes and SHA-1 checksums where available; saved
files are re-read and checked against SHA-256. Partial document exports retain a
`.partial` suffix. A nonzero exit code means the backup requires review. System
records and Sanity preview secrets are backup-only and must not be imported into
the new application or committed to Git. Keep a separate secure copy of the final
backup before cancelling Sanity.

## Implementation sequence and acceptance checks

Phases 2 through 4 are implemented for local testing, along with the initial
content and asset import. See
[local foundation and testing](member-hub-local-testing.md) for the schema,
permission tests, protected file endpoint and remaining integration work.
The user selected local testing before provisioning a separate hosted Supabase
project. Docker now runs the isolated local stack, and the membership screens and
account lifecycle have been verified through it. The admin content editor now
manages 39 migrated records and 52 local assets. Five comments and three unique
RSVPs were retained. The test site's original public content routes now read
Supabase with local asset URLs and the existing layouts. News/event discussion
reads, approved-member submissions and admin moderation also use Supabase.
Public listings exclude private/draft records, even for admins, and public routes
no longer enable Sanity live editing. RSVP submission/totals and newsletter
integration are also implemented locally. A read-only newsletter backup retained
31 subscribers and archived 83 historical sends; local import preserves consent
and does not overwrite later local changes. Real email delivery remains disabled:
local messages are captured in Mailpit. Hosted staging, final synchronization,
production cutover and Sanity dependency/Studio removal remain.

1. Complete inventory and verified backup; identify missing assets and schema drift.
2. Provision isolated staging data services; prepare versioned schema, RLS, storage
   and repeatable imports. Do not apply migrations to production during testing.
3. Implement registration, verification, approval, login, recovery, invitations,
   revocation and deletion. Verify access through UI, direct API and storage URLs.
4. Build the admin content hub, drafts, visibility and page section editor.
5. Import content/assets into staging and replace public queries while retaining
   existing layouts and URLs. Compare every public route and representative details.
6. Verify comments, RSVP totals, threaded replies, deletion anonymization and
   newsletter filtering. Test pending/revoked sessions and last-admin protection.
7. Take a fresh export and briefly pause content edits for final synchronization.
   Keep schema and production data changes backward-compatible with rollback.
8. Switch production only after staging verification. Remove Sanity dependencies,
   Studio and credentials after the rollback window and confirmed asset independence.

## References

- [Sanity dataset export API](https://www.sanity.io/docs/http-reference/export)
- [Sanity original image download parameter](https://www.sanity.io/docs/content-lake/image-urls)
- [Vercel Git deployment environments](https://vercel.com/docs/git)
