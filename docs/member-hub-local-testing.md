# Local member hub

All changes live in `feature/member-hub` in the separate migration worktree.
The site is now deployed. This guide covers ISOLATED Docker tests only; the normal
development command uses hosted data. See [hosted development](hosted-development.md).

## Try the member hub

Start Docker Desktop, then run these commands from the migration worktree:

```powershell
npm run member-hub:start
npm run member-hub:seed
npm run member-hub:dev:local
```

Open `http://localhost:3002/admin-sign-in`. Hosted-data development stays on port
3001; isolated tests use a separate `.next-isolated` build cache. The local-only test admin is
`admin@cypressdale.test` with password `CypressdaleLocal2026!`.
Register test residents at `/register`. Confirmation, recovery and invitation
emails are captured at `http://127.0.0.1:55424`; no email goes to a real inbox.
The admin approval dashboard is `/admin/members`.
Content management is `/admin/content`, also accessible through **Manage Content**
on the member dashboard and the administration tabs.

## Content Editing and Import

The original migration imported 39 content records (37 published,
two event drafts) and all 52 verified legacy assets. Five comments and three unique
RSVPs were retained. The export had six embedded RSVP entries because published
and draft copies overlapped; the importer deduplicates their source keys.
No existing member accounts were reset or modified during import.

Admins create and edit news, events, and custom pages in the content editor.
Titles use the same rich-text toolbar as the body. Formatting, alignment and line
breaks persist in drafts and published detail pages; content lists, search and
newsletters retain a plain-text title. Existing titles load automatically without
re-entry. Title text remains limited to 300 characters.
The File / Flyer section supports a content title plus a PDF or image without
requiring body text or an Image & Text section. Upload directly inside the section
to attach automatically, or select an existing Files asset. Uploads join Files,
never the document folder library. PDF pages render in preview and publication
(up to ten preview pages), with Open/Download links for the entire file. Normal
public/member access and in-use-file protection apply to these sections too.
The Content list groups a saved record and its `drafts.*` version into one row.
Paired entries show Published and Draft changes together; Edit opens the draft,
while Preview opens the published version. Draft-only previews open the editor's
preview view. Search matches either saved title and status filters include both
applicable versions. Only matching canonical IDs are grouped, never titles alone.
The trash action on a paired entry explicitly discards only the draft and keeps
the saved version. Publishing uses the existing version-checked canonical update.
Each Content list row also has a Delete action with explicit confirmation.
Deletion is admin-only and version-checked, and keeps uploaded files in the library.
Content with comments, RSVPs, a separate draft, or incoming record references is
protected; unpublish it instead to retain its history. Deleted imported records
cannot be restored by an old archive import. Program pages and document/winner
records remain managed in their dedicated sections.
Documents and folders have a dedicated workspace at
`/admin/documents`, linked from the Documents admin tab. Its collapsible folder/file
tree uses the original migrated folder IDs and assignments. New Folder creates a
folder; Add Document uploads or selects a file and assigns it to the chosen folder.
Files can be renamed, replaced, moved to another folder, published/unpublished, or
removed. Folder names, descriptions, order, and visibility can be edited. Nonempty
folders cannot be removed; published files require compatible published folders.
Unfiled documents remain available separately. Empty published public folders also
appear on `/documents`; visitors open each folder to access its assigned files.
Legacy document-editor URLs redirect to the matching item in this workspace.
Document uploads and all assets already assigned to document records belong to
the Documents library. They never appear as new choices in content media pickers.
The separate Files admin tab at `/admin/files` contains other pictures and files,
with search, type filtering, upload, previews, usage links, and removal. Uploads
made in content creation automatically enter Files, even before publishing.
Files uploads never appear in the document file picker. Existing shared references
remain readable and editable without moving them or breaking their URLs.
In-use files cannot be removed. Unused Files assets are removed from both metadata
and private storage; failures leave a retryable cleanup job rather than an exposed
file. Removed imported assets are retired so re-import cannot restore them.
Holiday Decorating and Yard of the Month now have dedicated admin navigation links
at `/admin/holiday-decorating` and `/admin/yard-of-the-month`, separate from the news,
event, and custom-page editor. Each has Winners and Page Settings views with a live
preview of the real public page. Winner titles, dates/holiday/year, placements,
judging sections, descriptions, and ordered photo galleries retain their existing
record format and URLs. Winner uploads join Files automatically.
Main-page settings change headings/copy, visible sections, page width, and background
images. Yard settings include overview, eligibility, criteria, and current/past winner
sections; holiday settings include holiday selection, prizes, shout-outs, and all four
judging maps. Default settings preserve the original page presentation. Program page
records are separate from winner entries; changing the page never rewrites winners.
Legacy winner-editor links redirect to the corresponding dedicated workspace.
Holiday Decorating has separate Christmas and Halloween pages. Public visitors
switch with tree/pumpkin controls at `/holiday-decorating/christmas` and
`/holiday-decorating/halloween`; `/holiday-decorating` retains the Christmas view
for existing links. Admins use plain Christmas/Halloween text controls at the
matching `/admin/holiday-decorating/christmas` and `/admin/holiday-decorating/halloween`
routes. Each page has its own settings record, winner list, and year tabs.
The selected entry page fixes the winner's holiday; switching pages asks before
discarding unsaved changes. Existing winner IDs, photos and holiday assignments
are retained. Legacy edit links open the matching holiday page. The Halloween
settings page is excluded from general Content and protected against deletion.
The content editor supports Portable Text formatting,
text/image/topic sections, section order, colors, borders, widths, alignment,
event dates in Central Time, attachments, galleries, visibility and publishing.
Uploads accept JPEG, PNG, WebP, GIF and PDF files up to 10 MB. Uploaded bytes are
checked for their actual format. A standalone Portable Text editor preserves the
existing document format; editable controls load in the browser to avoid SSR
hydration differences. Saved previews render on the server.

Plain-text content preserves explicit line breaks, blank lines, indentation and
repeated spaces in both live previews and published page renderers. Text still
wraps to the available display width. Rich-text paragraphs/headings/lists preserve
typed spacing, and empty paragraphs retain visible height. Plain text is escaped,
not interpreted as HTML or Markdown. Existing saved copy does not need re-entry.

The editor's Preview tab renders unsaved changes. News, Event, and Yard Winner
previews reuse the published page components, including their backgrounds,
module frames, typography, and media presentation. The preview has its own
responsive viewport, isolated from admin CSS; links and form submissions cannot
navigate away or change live data. Other content types retain the hub renderer.
Content Type remains editable after saving. Type changes persist through the
admin save function; conversions that would strand RSVPs, comments, or documents
inside a folder are rejected with an explanation instead of deleting that data.
The optional Side by Side view keeps editing controls and a live preview together.
Page Settings follows Preview in the view controls and opens a separate settings
view alongside a live preview for content type, visibility, page layout, media uploads and type-specific
metadata such as event schedules/flyers, news dates and document folders. Those
controls no longer take up space in the editing panes. Switching to settings and
back preserves unsaved changes.
Page Settings offers independent Community Sidebar, Calendar, and Email Newsletter
Signup switches for news, events, and custom pages. Each updates the live preview
and persists on the published page. Existing event calendar/signup settings are
retained when opening older records; new pages start with those panels disabled.
Slug is no longer shown: migrated page links use
record IDs; existing imported slug data is retained without asking admins to edit it.
The editor uses the display's full available width, with independently scrollable
panes on desktop and stacked panes on smaller screens. Switching views preserves
unsaved rich text; title, section, formatting and flyer changes update the preview.
Open Saved Page opens the original published news/event/yard detail route when
available, otherwise `/content/<id>`, with database permissions applied. Anonymous visitors cannot read
drafts or member-only pages. Published member pages appear in the member dashboard.
Publishing an imported `drafts.*` record updates its original canonical ID,
preserves associated comment threads and removes the superseded draft.

Save Changes on an already published record updates that published record;
Unpublish explicitly removes it from public/member listings. Version checks reject
conflicting saves from another tab/admin. Attachment links update in the same
database transaction as the content. Publishing rejects reuse of an attachment on
another published page with different visibility; upload a separate copy for that
case. This prevents a public page from exposing a member-only file.

To import the verified local backup again:

```powershell
npx supabase migration up --local
npm run member-hub:import
```

The importer only accepts the dedicated loopback stack on port 55421. It verifies
the raw export and asset checksums, checks the stored asset bytes, uses repeatable
IDs for historical comments/RSVPs, and keeps private contact emails outside public
content. Already imported records are skipped when unchanged. Locally edited
records are never overwritten, and retired imported drafts are not recreated.
The verified archive contains no embedded legacy CDN hyperlinks in content fields.

The original public content routes, discussions, RSVPs and newsletter content now
use the isolated Supabase backend. Existing imported comments are displayed in
saved hub previews; interactive discussions live on the original news/event routes.

The dedicated project is `cypressdale-member-hub`, with API port 55421 and database
port 55422. The launcher reads its generated credentials into process memory;
it does not copy the production `.env.local` or write test keys to files. Studio,
CMS clients, preview routes and direct CMS SDK dependencies have been removed.
No CMS project, token or environment variable is needed. The launcher removes
real email-delivery credentials. Newsletter records have been imported;
the legacy map feature's data has not. Test forms cannot modify live records.

To stop the local database containers without removing data:

```powershell
npx supabase stop
```

## Run the local checks

Use Node.js 22.18+ (the configuration tests use native TypeScript support):

```powershell
npm install
npm run member-hub:test
npm run migration:test
npm run typecheck
npm run member-hub:e2e
```

The database tests use PGlite, a local PostgreSQL engine running in memory. They
apply the actual application migration and exercise row-level security as anonymous,
authenticated and service-role callers. Only Supabase's `auth` and `storage`
schemas/roles are mocked. Tests do not load `.env.local`, connect to any remote
service, send emails or persist resident data.

The Playwright checks require the local Docker stack and the dev server. They
exercise real local Auth, PostgreSQL and Storage, including registration,
confirmation, approval, immediate revocation of file access, password recovery,
self-deletion/anonymization, new and existing-user admin invitations, and
last-admin deletion protection. Screenshots cover desktop and mobile. A separate
temporary database tests simultaneous admin removals with independent PostgreSQL
connections and is removed afterwards. Only test fixtures are created/deleted.

Coverage includes role escalation attempts, pending/unverified/member access,
admin-only editing, private profile isolation, direct storage access denial,
revocation with an existing session identity, renewed approval after address
changes, invitation matching/expiry/reuse, author spoofing, deletion anonymization,
reply preservation, and rollback when attempting to remove the last admin.

## What the migration creates

`supabase/migrations/202610140001_member_hub.sql` contains the application schema.
It assumes the standard Supabase Auth and Storage schemas already exist.

- `hoa_profiles`: resident identity, address, role and approval status.
- `hoa_content`: all supported content kinds, published/draft status, visibility,
  Portable Text, section JSON and layout settings.
- `hoa_assets` and `hoa_content_assets`: storage metadata and content attachments.
- `hoa_comments` and `hoa_rsvps`: linked authors with preserved historical records.
- `hoa_private`: invitations, minimal audit records, legacy contact details and
  permission helpers; keep this schema out of Supabase's exposed API schemas.
- `hoa-content`: private storage bucket. No resident Storage SELECT policy exists.

Content IDs preserve the original imported IDs, including separate `drafts.*` versions.
Import must normalize event/document/winner fields into `settings`, preserve
formatting and extract comments/RSVPs into their own tables. Never put RSVP emails,
system records, tokens or raw private contact data into public content JSON.
Unlinked assets are visible only to admins; linked assets inherit access from their
content. An asset shared with published public content is necessarily public.

Database RPCs support membership approval/revocation and admin invitation
issuance/acceptance/revocation. They check the caller's current profile and verified
email. The initial verified admin can be designated once via `hoa_bootstrap_admin`
using the service role; ordinary users cannot invoke that operation.

Deleting an Auth user invokes the account-removal trigger in one database
transaction. It removes the profile and verified legacy contact details and
anonymizes linked comments/RSVPs to `User Cleared`. Comments and threaded replies
remain intact. Legacy records are not linked to accounts simply by matching emails.
The removal server action authenticates the caller, rechecks admin access when
removing someone else, verifies their current password, and calls the Auth Admin
API. The deletion confirmation dialog requires an explicit acknowledgement.

## Server integration

`lib/member-hub/server.ts` creates user-scoped Supabase clients and checks current
account/member/admin permissions. Browser sessions use HttpOnly cookies through
`@supabase/ssr`; `proxy.ts` refreshes sessions only on member/auth routes. Bearer
authorization remains supported for file requests. Every access check verifies
the current Auth user and database profile. Server actions handle registration,
login, confirmation resend, recovery, invitations, approval and account management.

The hub has its own route-group layout. The existing site's Admins navigation
links to `/admin/content`, with authentication at `/admin-sign-in`.
All account pages are dynamic and excluded from search indexing. Email callbacks
accept only expected verification types and redirect within the account flow.

`GET /api/member-hub/assets/[id]` checks asset metadata using the caller's RLS
permissions before retrieving bytes with server-only storage credentials.
It returns no-store responses and never redirects to a reusable signed URL.
Anonymous callers can retrieve only assets linked to published public content.
Denied/unknown assets return 404 without exposing their metadata. Safe bitmap images
render inline; files download as attachments. PDF flyer previews use an explicit
view request while retaining the same authorization and no-store headers.

The hub is disabled by default. `.env.member-hub.example` lists the separate
credentials needed later. Local mode permits loopback hosts only. Staging mode
requires a known production URL and rejects that host. Do not reuse production keys.
Production requires a separate explicit launch gate and the existing hosted project;
see [production configuration](production-configuration.md). No production flags
have been enabled and no hosted migrations/deployments have been performed.
The user-client key must be a publishable key or legacy `anon` key; secret and
service-role keys are rejected there so configuration mistakes cannot bypass RLS.

Verification includes member-hub and offline migration checks, TypeScript,
the browser account flows and the real-PostgreSQL concurrency check.
Unconfigured deployments still return the expected disabled response from the
file endpoint. The local launcher explicitly enables this isolated test environment.
Three content browser tests cover uploads, rich text and last-keystroke saves,
mobile/desktop layouts, permissions, imported formatting, conflicting edits and
draft publication with reply preservation. Editable pages also have a hydration
error check. Browser tests use their own temporary records; accounts created by
interactive testers are preserved.

## Remaining integration checks

Public account navigation now separates **Admins** from **Homeowners**.
Admins open `/admin/content`, with a dedicated `/admin-sign-in` that accepts only
active, verified, invited admins and does not offer resident registration.
`/homeowners` is a public placeholder only: no login, registration, account data
or homeowner backend is connected to it. Existing resident testing routes and
accounts are preserved but are not the Homeowners portal. The homeowner backend
and its future authentication flow still require separate design and implementation.

Before hosted staging or production rollout, verify delivery through the chosen
email provider, HTTPS cookies, allowed redirect URLs, and hosted Auth/Storage.
Copy the email templates in `supabase/templates/` into the hosted project's
corresponding Auth email templates. Configure `MEMBER_HUB_SITE_URL` and the
`/auth/confirm` redirect allowlist for that staging origin. Local emails intentionally
use the captured inbox. Account changes use a transaction-level advisory lock;
concurrent deletion was verified against local PostgreSQL.

The test site's original home, news, events, documents, yard winners and holiday
winners now read the imported Supabase content. Original URLs and rendering layouts
are retained, with files served through the protected local asset endpoint.
Public listings always exclude drafts and members-only records, even for admins;
published members-only detail URLs still require the caller's current access.
Draft previews remain in the admin hub rather than public routes or draft query flags.
Legacy live editing, Studio, CMS clients and draft-mode endpoints are removed.

News and event discussions now use imported threads and account-derived names.
Verified, approved members can comment and reply. Pending/revoked accounts cannot.
Admins can remove comments without a passphrase; parent comments require removing
their replies first. Account deletion retains the thread with "User Cleared" authors.
Two additional browser tests verify public routes, image/file rendering, mobile
overflow, private/draft exclusion, comment authorization, cross-thread reply rejection,
moderation and deletion anonymization. Browser tests reject legacy CMS requests.

RSVP and newsletter integration is complete for local testing. RSVP responses use
the signed-in account name; approved accounts can choose going/maybe, change their
answer or remove it. Anonymous, pending and revoked accounts cannot submit.
Totals use the greater of the original counter or imported historical responses,
plus new account responses, so old entries are not counted twice. Account deletion
preserves RSVP totals under "User Cleared". Public totals do not expose attendee
names, emails or account IDs. Calendar cards and event details share these totals.

Newsletter management is `/admin/newsletter`: public-content preview, confirmed
subscriber count, local send command and campaign history. `/admin/subscribers`
provides the admin-only contact directory, status filters, search and confirmed
subscriber removal. Removed records are not restored by backup imports. See
[newsletter testing and delivery](newsletter-migration.md) for backup/import,
confirmation, unsubscribe, scheduling and retry safeguards. Account deletion now
offers separate newsletter unsubscription, committed with Auth deletion and rolled
back if last-admin protection rejects the removal. Homeowners remains a placeholder.
Production remains unchanged on `main`.

References:

- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase account profiles](https://supabase.com/docs/guides/auth/managing-user-data)
- [Private storage and signed URLs](https://supabase.com/docs/guides/storage/serving/downloads)
- [PGlite](https://pglite.dev/docs/about)
