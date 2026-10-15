# Member Hub Migration Status

## Complete in Development

The isolated migration worktree serves public content, original detail URLs,
documents/folders, images/files, discussions, RSVPs, newsletter subscriptions and
admin tools through Supabase. Admin access is invite-only. Accounts support
approval/revocation and removal, with retained comments/RSVPs labeled User Cleared.

Holiday Decorating and Yard of the Month have dedicated managers, configurable
public pages, year tabs, and galleries. General editing includes live previews,
independent sidebars, rich text, layouts, media uploads and visibility controls.

Studio, compiled Studio output, CMS clients, GROQ queries, draft-mode routes,
visual editing, image CDN configuration and passphrase-based news deletion have
been retired. Manage news visibility through the admin content editor instead.
The legacy Board/Team Chat tool is retired by request; a new notes/collaboration
area is not implemented. Homeowners remains a separate placeholder.

The standalone Portable Text editor and renderer stay to preserve saved content.
Their transitive schema/type utilities do not connect to a CMS. Historical
database migrations, original record IDs, and offline archive compatibility are
deliberately retained rather than rewriting data or breaking links.

## Protected Archives

Ignored `backups/` holds verified original content/media and newsletter snapshots,
plus a private retirement archive of the old Studio source and export tool.
These are recovery records, not application dependencies. Never expose them via
`public/`, commit them, or remove them as build-cache cleanup.

`npm run member-hub:import` and `npm run newsletter:import` can restore verified
local archives into the dedicated loopback stack. They preserve locally edited
records, deletion retirements and subscription consent. No CMS account/token is
needed to restore an existing archive. Do not run a fresh import against a hosted
database without a reviewed cutover process.

## Remaining Before Production

The selected rollout now uses the existing Vercel and Supabase projects, not a new
hosted database. See [the existing-project cutover plan](production-cutover.md) for
the read-only audit, confirmed newsletter schema conflicts, preservation inventory
and revised rollout gates. Do not create another hosted project or replay the local
migrations directly against the existing database.

The original production worktree and deployed website have not been changed.
This is a completed local content migration, not a production cutover.

The security pass updated Next.js to 16.4.1 and patched compatible dependencies.
The production dependency audit is clean; nine development/build-tool findings
remain for review. See [configuration and security](production-configuration.md)
for the explicit connection/email gates, verification scope and remaining issues.

1. Verify hosted backups and finalize the rehearsed existing-project schema package.
   Configure Auth email templates/redirects and verify storage and HTTPS sessions.
2. Reconcile fresh live content/media and newsletter consent changes. Older
   archives do not contain content added to the live website since their capture.
3. Repeat the verified local backup/recovery and transfer checks under an edit
   freeze, including content that was never part of the legacy archive.
4. Test real email with allowlisted recipients and verify the sending domain,
   confirmation/unsubscribe flow and scheduler authentication.
5. Review the production configuration and data rollout before enabling the
   explicit launch flags. Test the verified real-admin identity mapping.
6. Review the optional resident-map backend/data separately, then switch hosting
   only after approval and keep a tested rollback path.
7. After successful cutover, disable old webhooks, revoke old CMS API tokens and
   cancel/decommission the hosted CMS separately. No remote project was deleted,
   subscription canceled, credentials revoked, or live dataset altered here.

See [local setup](member-hub-local-testing.md),
[newsletter delivery](newsletter-migration.md), and the
[historical discovery record](archive/initial-migration-plan.md).
