# Existing-Project Content Transfer

These tools reuse the current Supabase project. Preparation reads the local Docker
database and hosted subscriber/account metadata, but never writes to the hosted
project. No backup or recovery rehearsal is required by these commands.

## Prepare Current Data

From the member-hub worktree, with Docker and local Supabase running:

```powershell
node scripts/migration/prepare-transfer.mjs --source-env ../Cypressdale_HOA/.env.local
```

The private, git-ignored `.deployment/transfer-<timestamp>/` package contains current
content, drafts, settings, folder assignments, Files/Documents classification,
retirement records, author mappings, and checksum-verified file bytes. Auth export
contains only IDs, emails and verification timestamps, never passwords or sessions.
Mailpit campaigns/deliveries are not imported. Never commit or publicly serve this
directory. Pause editing during final preparation and keep it paused through cutover.
Preparation refuses to finish if local database rows change during file export.

`manifest.json` identifies any missing verified accounts and subscriber conflicts.
The known test admin is excluded, but its content remains and discussion authors
become User Cleared. Real users must map to verified identities in the existing
project. No tool creates accounts or marks their email addresses confirmed.

`transfer.sql` is generated only after accounts and subscriber conflicts resolve;
at least one retained approved admin is required. Existing hosted subscriber IDs,
tokens and consent stay authoritative. Any conflict must be reviewed, never guessed.
Explicit local subscriber removals remain explicit removals, not reactivations.

## Verify Files Without Uploading

Use the exact package directory printed by preparation:

```powershell
node scripts/migration/upload-transfer.mjs --bundle .deployment/transfer-<timestamp> --source-env ../Cypressdale_HOA/.env.local
```

Default mode performs GET requests only against hosted storage. It validates local
package checksums, pins the prepared project, compares existing objects, and reports
missing files. A missing content bucket is reported rather than created. Existing
objects with different bytes cause an error, never an overwrite.

## Rehearse the Generated SQL

```powershell
node scripts/migration/verify-transfer.mjs --bundle .deployment/transfer-<timestamp> --source-env ../Cypressdale_HOA/.env.local
```

This reads current hosted newsletter/account expectations and executes the generated
SQL against a disposable in-memory PGlite fixture. It compares all ten transferred
tables and retained subscriber/history rows exactly. Missing verified identities are
simulated ONLY inside that disposable database and are reported as such; they never
satisfy production account gates or create hosted users. Storage rows are mocked,
so physical-file verification remains a separate check. The private receipt remains
`productionReady: false`. No backup or working-database restore is performed.

## Approved Cutover Sequence

1. Resolve the retained admin identity in the EXISTING Supabase project's Auth
   users. The required email appears in the private manifest. Verify account
   ownership and email confirmation; do not invent a replacement identity or copy
   the local test password. Coordinate real Auth email testing with staged deployment
   callbacks, because the old live website does not yet provide the new auth routes.
2. Review and explicitly approve applying the existing-project schema candidate
   prepared by `prepare-existing-project.mjs` using the hosted SQL editor. Do NOT
   run the unadapted migration chain or `supabase db push` against this project.
   Use the latest candidate: it explicitly enables RLS on every new hub table,
   including private account-removal preferences and newsletter retirements.
   SQL Editor may still flag DELETE statements inside stored function definitions;
   creating those functions does not execute their deletion logic. Do not use the
   editor's automatic rewrite to add policies or change the reviewed transaction.
3. Regenerate the transfer package after account setup and the final edit freeze.
   Ensure there are zero conflicts, a generated `transfer.sql`, and the correct
   verified admin mapping. Preserve legacy newsletter history and consent.
4. Run the uploader in default dry-run mode. Review its project fingerprint and
   manifest checksum. Actual uploads additionally require `--apply`,
   `--confirm-project <fingerprint>` and `--confirm-manifest <checksum>`. These flags
   must be supplied deliberately, not enabled in an npm lifecycle or deployment.
5. An approved upload uses create-only objects, verifies downloaded bytes, and writes
   a private receipt. On failure, previously uploaded objects remain; rerun to verify
   and resume without deletion. It never imports database rows or creates buckets.
6. After every file verifies, review and apply the matching `transfer.sql` in the
   existing project's SQL editor. It runs in one transaction with locks, rejects
   changed subscriber/account expectations, non-pristine destinations and missing
   storage objects, preserves content versions, and restores normal triggers before
   commit. Any error requires rolling back the failed transaction before retrying.
   Do not rerun a successful import. Object existence is not a checksum check; the
   successful uploader receipt is required separately.
7. Verify record counts, admin privileges, folder links, images, public/member
   visibility and subscriber status in a protected staged deployment, then follow
   `production-configuration.md` for final Vercel cutover. Review/retire the old
   chat policies and finish legacy confirmation-link handling before launch.

The tools do not execute SQL remotely, send invitations, promote a deployment,
change environment flags, delete storage objects, or start newsletter delivery.
