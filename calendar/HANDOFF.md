# Calendar182 handoff

Updated: 2026-11-20 (America/Detroit). Resume from the current checkpoint below; older sections retain historical evidence and may describe superseded intermediate states.

## Current stopping point — read first

### Public release correction (November 21)

Owner screenshot confirmed GitHub Pages still showed the old settings layout;
previous activations updated only the computer-hosted bundle. Owner requested the
missing update on iPad/phone. Publishing the tested settings layout and supporting
computer-settings sync checkpoint through main/Pages. Public settings remain local
per browser; automatic settings synchronization is available only through the
computer-hosted Calendar. No origin migration, storage clearing or credentials
are included. Verify Pages workflow and live asset before calling release complete.

### Current: nearby Shensha sync controls (November 21)

Owner requested and authorized publication of Sync now plus compact status beside
Shensha Save/Load. Added a settings-specific control through the existing computer
workspace context, sharing its manual wake, authentication, account, pause and busy
guards. Clicking sync never saves drafts. Settings status distinguishes loading,
local-only/not uploaded, durable pending, syncing, synced, paused, unavailable and
conflict review. Failures remain visible rather than being cleared by periodic
settings refresh. Public Calendar explicitly reports local-only; only the computer
build exposes the functional sync button. No backend or stored-format changes.

33 app tests, typecheck/lint and public/computer builds passed. Chrome/WebKit
computer browser checks exercise the nearby button, cross-device propagation,
offline error/retry, pause/resume disabling, conflicts and draft preservation.
Public browser regression verifies local-only wording and no misleading sync
button. Publishing the static update to both calendars; retain old hashed assets,
no service restart or data changes. Earlier manual transfer remains unverified;
do not silently import the temporary public-settings export during this UI task.

### Current: direct optional Shensha checkboxes (November 21)

Owner approved replacing 命/运 dropdowns with two exclusive, individually
clearable checkboxes beside Enable, including custom items. Neither checked maps
to the existing unclassified value; selecting one clears the other. Enable is
independent and retains selections. Custom Positive/Negative/Neutral use the same
exclusive/clearable checkbox pattern; clearing all retains no effect choice.
Removed visible Strength/Effect headings. Stored format, sync, calculation and
backup behavior are unchanged; no migration. 33 app tests, typecheck/lint and
Chrome/WebKit Shensha browser checks passed, including optional/exclusive choices,
custom clearing, persistence, notes/drafts and responsive layouts. Screenshots
reviewed. Publishing to public Pages and updating computer static assets without
service restarts; preserve all settings and note stores. Prior settings transfer
still awaits owner sign-in/explicit continuation; do not claim it is complete.

### Current: compact settings and computer-hosted sync choice (November 21)

Owner showed updated public-site screenshots and chose using the existing
computer-hosted Calendar for automatic sync, rather than adding a public backend.
Public-site browser settings must be exported/imported once into the same computer
account; no automatic cross-origin migration or public-site sync is implied.
Tightened desktop/tablet editor width and aligned enable/strength controls, while
preserving the accepted phone layout. Chrome/WebKit Shensha browser checks and
lint/typecheck passed. Existing public settings were exported through the user's
Chrome UI to /tmp/calendar182-shensha-transfer.json; source data remains intact.
A new incognito computer-hosted tab is open at the retained LAN address. Awaiting
the owner's same-account sign-in before UI import/verification. Do not put settings
contents or credentials in Git. Transfer status will be recorded after completion.

### Current: Health Calendar settings presentation (November 21)

Owner approved adopting Health Calendar's Shensha settings format/styling.
Replaced per-item collapsed editors with grouped 神/煞/自定义 rows, visible target
chips with removal buttons, searchable expandable target pickers and allowed
天干/地支/干支 sections. Enable, manual 命/运/未选 and custom effect controls stay
visible. Disabled items retain targets; explicit Save/Load, sync conflicts and
backups are preserved. Phone rows stack; tablet/desktop use two columns, 44px
controls and bounded scrolling pickers. Search and Escape/focus handling verified.
Original Health Calendar was read only; no matching or storage changes.

33 unit tests, typecheck/lint, ordinary/computer builds passed. Updated existing
Chrome/WebKit Shensha browser checks cover chips, filtering, empty results,
disabling/re-enabling, strengths, existing calendar/note/draft regressions and
320/390/820/1280 layouts. Reviewed phone/desktop screenshots. Computer sync browser
regression passed; its manual-sync helper now waits for a completed settings GET
and enabled sync control, and reload assertions await the asynchronous refresh.

Activated only the computer-hosted static bundle, retaining previous hashed assets
and a temporary rollback copy. HTTP and CA-validated HTTPS returned the exact new
index with 200 responses. No service restart or note/settings migration. Ignored
settings-layout-activation.json records the rollback location. Public source is
updated locally; no GitHub Pages deployment was made. Save drafts before refreshing.

### Current: Shensha settings sync (November 21)

Owner approved proceeding with cross-device Shensha settings synchronization.
Implemented account-scoped IndexedDB settings persistence, one-time validated
legacy migration, durable pending saves, revision/epoch guards, immutable retry
acknowledgements and explicit whole-settings conflict choices. Existing computer
sync controls also govern settings. Drafts remain local. Public build stays local.
Shensha import now awaits durable saving; settings snapshots retain server history.
Notes/outboxes/accounts/credentials are not migrated or cleared. Recovery expansion
remains paused. See docs/SHENSHA_SYNC.md for behavior and verification scope.

33 app tests and 73 Python service/backup tests passed, with clean typecheck/lint.
Chrome/WebKit two-profile tests cover transfer, offline conflicts, both choices,
legacy migration, draft retention, reload, account isolation and mobile layout.
Existing local Shensha backup/import browser regression passed. Activated the tested computer-hosted bundle after a fresh verified snapshot.
Restarted only Calendar HTTP/HTTPS LaunchAgents. Both returned 200 (HTTPS with
explicit CA validation); database integrity passed. Live epoch, 28 note operations,
current-record count and six sessions were unchanged. Previous bundle retained in
the system temporary directory; ignored settings-sync-activation.json records it.
No public deployment was made. Next: save drafts, close older Calendar tabs, reopen
on both devices and use the same account. Review any differing preexisting settings
in Settings; no new physical-device acceptance is claimed.

### Current: automatic destination-copy retention (November 21)

Owner requested backup cleanup after seeing hourly iCloud folders. Implemented
backup_retention.py with fresh-verified-replacement gate, shared copy lock,
24-hour/all, 7-day/daily and 28-day/weekly buckets (America/Detroit). Only explicitly
marked automatic copies are eligible. Manual exports pin copies; legacy/unmarked,
corrupt, symlinked, future-dated or extra-file bundles remain protected. No inference
of provenance. Local 168-copy policy and Shensha exported files are untouched.

68 Python service tests passed. Live read-only preview showed 41 legacy bundles,
none eligible for removal. Created verified automatic bundle ending 2a3393d5;
restarted only Calendar182 HTTP/HTTPS agents to load the new scheduler and checked
200 responses including CA-verified HTTPS. Epoch, 28 operations, 6 sessions
unchanged. Final inventory: 1 managed copy, 41 protected, zero deletions. Future
hourly copies now use retention. Older folders intentionally remain. No frontend
or static bundle update was necessary. Recovery-tooling expansion remains paused.
See docs/BACKUP_COPIES.md for policy and limits.

### Strength shown by border style

Owner approved solid borders for 命, dashed for 运, dotted for unselected strength.
Week and Day/hour badges use 2px borders with identical text weight and nature
colors for all strengths. Green/red/gray now represent nature alone, with pale
fills; retained category labels remain hidden. Matching, settings and backups are
unchanged. Settings Help explains border meaning. Published to both calendars.

### Current: Shensha settings export/import

Added Settings → Shensha settings backup, separate from note backup. Export
contains saved targets/enabled flags, manual strengths, custom effects, time zone,
and retained birth pillars in a versioned calendar182-shensha JSON envelope. No
notes, account IDs or credentials. Import validates format/version, size (128 KB),
zone and targets before showing a replacement preview with per-item differences,
zone changes and retained birth-data changes. Explicit Replace applies to the
current browser/account only; Cancel does not write. Unsaved settings disable both
actions. Changed local settings invalidate the preview; other-tab changes and
storage failures refuse replacement. Notes/drafts are untouched. Export/import is
manual transfer, not automatic synchronization; blank zone uses receiving device.

32 unit tests, typecheck/lint and isolated Chrome/WebKit backup browser checks
passed: real downloaded-file roundtrip on a separate context, persistence/reload,
invalid file, preview/cancel, dirty guard, note draft preservation, concurrent
changes, write failure and mobile layout. Existing Shensha regression also checked.
Release is published to both public and computer-hosted calendars.

### Kongwang moderates without cancellation

Owner requested retaining each Shensha's nature/color when 空亡 occurs. Removed
blanket inactive styling and renamed the engine flag to hasKongwang. All matches,
repeat counts, hour eligibility and manual strengths remain. 空亡 is gray; other
items retain positive/negative/custom colors. Help and hidden future date-search
copy now describe coexistence, not cancellation. No numerical weakening is applied.
Regression checks verify preserved counts/hours and distinct colors with 空亡.

### Health Calendar badge styling

Owner supplied Health Calendar screenshot and requested its Shensha format/styles.
Read original styles.css (read-only) and adopted 1px currentColor outlines, 8px
rounded corners, 6px/10px padding, and its pale green/red/gray palette for Week
and Day badges. Mobile padding adapts to seven columns. Manual strength styling,
Kongwang suppression, hidden category labels and all matching rules are retained.
No Health Calendar files changed. Published to both Calendar182 deployments.

### Display-only label removal

Owner requested removing 命/运 names from Shensha displays. Week badges show
only item names; day/hour badges retain matching targets but omit category text.
Strength colors/classes, stored choices and Settings selectors remain unchanged.
Published to both calendars after typecheck, lint and browser verification.

### Current: seven equal columns and compact Day results

Week button opens today's Sunday–Saturday week. Horizontal movement then shifts
one day at a time while keeping seven consecutive dates visible. Seven equal
columns use the available screen height on phone/tablet/desktop; contents scroll
vertically within columns. There is no detail panel beneath Week. Date buttons
open Day view. Day notes precede Shensha; unmatched pillar sections and entirely
empty Shensha results are omitted. Routine explanatory text moved to Settings
Help; operational save/error messages remain.

Colors now represent positive (green), negative (red), neutral/Kongwang (gray),
with dark/bold 命 and softer 运. Compact 命/运 labels remain. Custom items have
an optional positive/negative/neutral effect choice, preserved on save; missing
choices are outlined. Kongwang remains visible and neutral while its suppression
grays other matches. Birth settings/date search remain hidden.

29 unit tests, typecheck/lint and Chrome/WebKit checks cover Sunday-first entry,
seven equal columns at 320/390/820/1280 widths, day taps, note-first ordering,
hidden empty Shensha, drafts, swipes, boundaries and saved settings. Mobile
screenshots reviewed. Publishing to main and the computer static bundle, with
no service restart or note-store changes.

### Current: horizontal Week/Day navigation

Owner requested horizontal navigation in place of vertical lists. Week now uses
seven consecutive dates centered on the chosen date when opened from Month,
clamped at 1901–2100. Swipe/trackpad-horizontal movement shifts one day at a time;
it does not enforce Sunday/Saturday boundaries. Tablet/desktop has seven tall
columns with Shensha and note previews; phones (<=600px) have seven date buttons
and a spacious selected-day detail/editor panel. Day renders one full-width date,
with full Shensha and notes, horizontal previous/next movement and ordinary
vertical page scrolling. Today and arrow buttons remain available. Keyboard
left/right is available on the swipe region. Input/editor gestures do not navigate.
Drafts survive date/view changes. Manual strengths and hidden future features
remain as previously agreed. Removed obsolete virtual-list component.

28 unit tests, typecheck/lint, isolated Chrome and WebKit checks passed, covering
both swipe directions, rolling date selection, phone/tablet responsiveness,
1901/2100 limits, Today, editor and vertical-gesture protection, draft preservation,
manual settings and storage safeguards. Phone and tablet screenshots reviewed.
Published to both calendars without restarting the computer service.

### Current: scrollable Week/Day and manual 命 / 运

Owner approved the combined proposals: vertical continuous Week/Day displays,
manual strength per Shensha item, and hiding birth settings alongside date search.
Week and Day use a virtualized scroll region with fixed controls, visible-period
heading, Today/previous/next navigation, remembered positions while switching
views/settings, and date buttons opening details with a Back to calendar list
button. Day cards include lunar labels, Shensha summaries and short note/draft
previews; note editors remain outside the scroll list. Limits are 1901–2100.

Each Shensha item (including custom) now has Not chosen / 命 / 运. Its manual
choice applies to all targets, ignores retained birth data, and persists locally.
命 uses dark/bold green, red or purple; 运 uses softer colors and normal weight.
Labels remain explicit, repeat counts remain separate, and 空亡 stays gray/inactive.
Legacy selections and birth data are preserved; missing manual choices stay Not
chosen. Both inactive UI components live in src/future with a README; neither is
imported by the active app. Automatic birth classification remains only for future
use. No notes/sync/recovery behavior changes.

28 unit tests, typecheck, lint, and isolated Chrome AND WebKit checks passed:
scrolling/virtualization, Today, limits, view-position restoration, detail return,
manual strengths/reload, 320/390/1280 layouts, note drafts, storage conflict/failure.
Mobile screenshots reviewed. Published to public main and computer static bundle
without restarting services. Settings remain local per browser/account.

### Birth pillars and 命 / 运 classifications

Owner approved trying target-level classification using all four manually entered
birth pillars. Settings now accept valid sexagenary pairs or unknown for each
pillar. A target present in any known pillar is 命 (stronger); absent with all
four known is 运 (weaker); absent with incomplete pillars is uncertain; no birth
data is unclassified. Stems/branches match their components, pairs match exact
pillars. Each encountered target is labeled independently. No multiplier, repeat
count, hour eligibility or 空亡 change. Existing stored settings migrate with
blank birth pillars without losing targets. Birth settings are local per browser/
account, unsynced and outside note backups. 27 unit tests, typecheck/lint and
isolated browser checks passed, including persistence and unknown-hour behavior.
Published to both calendars; search remains hidden and four views remain available.

### Year, Month, Week and Day views

Added a view switch above the calendar, responsive twelve-month year display,
Sunday-first week display and selected-day view with existing details/notes.
Navigation moves by the active period, clamps at 1901–2100, and handles leap
and short months. Clicking dates retains note drafts. Upcoming Shensha search
remains hidden. 26 tests, typecheck, lint and isolated Chrome checks passed,
including all four views at 320/390/1280 pixels and draft preservation.
Published to public and computer-hosted calendars without service restarts.

### Upcoming search hidden at owner request

Owner requested hiding Find Shensha dates. Removed the upcoming-search panel
from the calendar UI; retained its implementation for possible later use.
Shensha settings and selected-day results remain available. No saved settings
or notes were changed. This visibility change is published to both calendars.

### Upcoming matching dates (November 20)

Owner confirmed the first Shensha release works on mobile devices and iMac and
approved upcoming matching dates. Added a 1–93 day inclusive range search using
saved settings and the existing engine, 10-result pagination, pillar explanations,
matching hour intervals, explicit inactive 空亡 dates, and open-day navigation.
Year/month matches intentionally appear on every applicable day. No settings sync,
note changes, or recovery work. All 25 app tests, typecheck, lint and isolated
Chrome checks passed (320/390/1280 widths, pagination, date navigation, invalid
range and preservation of unsaved notes). Prior public release 16e16cf deployed
successfully and its live assets were verified. This increment is being published
through main and the computer static bundle, with no service restart.

### Publishing authorization and local activation (November 20)

Owner explicitly requested “update and publish the calendar,” authorizing main/
GitHub Pages publication for this milestone in addition to the computer-hosted
bundle. This supersedes earlier no-main/no-deployment notes for this release.
Local static assets were updated without restarting HTTP/HTTPS jobs (PIDs
785/798 unchanged), touching notes or changing sessions/credentials. Old hashed
assets were retained and previous bundle copied to the system temporary folder
calendar-before-shensha-dl_c8hcm. HTTP /calendar/ served the verified new script
index-C7ttni5C.js. Public ordinary build uses index-B4DwZFng.js and remains
local-only; Shensha settings do not sync between devices. Save unsaved notes and
selections before refreshing. Secure offline clients may wait until all Calendar
tabs close before activating. Publication is through main and the Pages workflow;
verify the matching deployment run/live asset for final release status.

### Active feature: Shensha first milestone (November 20)

Owner authorized beginning Shensha after pausing recovery tooling. Implemented
src/shensha.ts deterministic matching/pillars, src/useShensha.ts local scoped
settings and src/ShenshaPanel.tsx settings/day results, integrated into App.tsx.
All 18 named items and 3 custom slots are present. Reference target restrictions,
noon/year/month ranges, midnight day rollover, repeat/hour gating and 空亡 rules
are preserved. Settings save locally per note/account storage scope; no settings
sync, notes-backup inclusion, encounter lists or birth-chart inference yet.

24 app tests and isolated Chrome checks passed; 55 read-only original-engine
comparisons passed. TypeScript/lint passed. Build artifacts are isolated under
/tmp/calendar-shensha-build and /tmp/calendar-shensha-staging-build, with the staging bundle subsequently installed as recorded above. See docs/SHENSHA_FIRST_MILESTONE.md for exact test scope,
commands, boundaries and remaining gaps. Changes are included in the Shensha release checkpoint.

Next: review the first usable settings/day-details milestone, preserve its tested
checkpoint, and activate only through a controlled step that protects unsaved
notes. Then add encounter lists; settings synchronization is a later increment.
Do not restart recovery development or modify Health Calendar/public deployment.

### Prior checkpoint: recovery paused

Recovery development is paused by owner decision on November 20. The owner chose to preserve the tested work and use Calendar normally rather than expand recovery tooling. The active project is
`/Users/ruixingshi/Python/calendar182`, branch `sync-prototype`, not `reader_app`
or `reader-notes`. This handoff is `calendar/HANDOFF.md` within Calendar182.

### Repository checkpoint

- This checkpoint contains the November 20 combined multi-device choice and
  per-operation preservation review, 12 combined-plan tests, documentation and
  the consolidated handoff. It is being committed and pushed on sync-prototype
  under the subject `Checkpoint recovery review and pause further tooling`.
- Previously pushed implementation: **9f4d890** (multi-device comparison),
  **674d0d3** (authentication/export/recovery safeguards) and **59a4322**
  (synthetic reconstruction drill).
- Only the five intended implementation/documentation files were changed at
  this checkpoint. No unrelated work was found or discarded.
- No merge to main, public deployment, staging asset replacement or service
  restart is part of this checkpoint. GitHub-hosted CI is not claimed here;
  recorded passing results are local.

### Completed and verified

- Actual iMac restart and account-a access on computer/iPad were reported by the
  owner. Calendar's November 19 note was saved on iMac; owner confirmed iPad
  delivery and added a return marker. Direct iMac inspection showed both markers
  and “Saved notes synced.” Do not repeat basic sync/reboot checks.
- Managed HTTP/HTTPS services remained loaded with PIDs 785/798 at the last check.
  Settings showed automatic startup, hourly snapshots and a verified copy time.
- Test sign-in throttling, optional account/service/cursor export metadata,
  backward-compatible older exports, single-device comparison and explicit
  keep-server/use-device/defer review choices are implemented in source.
- Recovery choices require explicit tombstone confirmation and reject stale
  comparison fingerprints. Plans are non-executable; ambiguous operation history
  is retained for review rather than silently replayed or discarded.
- Synthetic reconstruction drill creates a new temporary restored database,
  checks selected contents/history/deletions/account isolation, preserves source
  bytes and original retry acknowledgements, and archives the complete device
  export. It is a test fixture, not a general recovery/apply tool.
- Multi-device comparison accepts 2–8 labeled exports against one frozen
  snapshot. It reports current-content differences, absences, deletion markers,
  per-device pending/history concerns and cross-device ID/content collisions.
  No real exports were collected or compared during implementation.

- Combined multi-device choices now default to defer, select an exact device or
  server candidate, require explicit deletion confirmation, and bind the entire
  input comparison. Changes to history/device membership/labels invalidate old
  choices. Per-device operation concerns and ID collisions remain unresolved in
  the non-executable plan. No real exports were collected.

- Choices format v2 adds device+operation-ID preservation review: retain pending
  edits, acknowledgement evidence or unclassified history, or quarantine ID
  conflicts. Conflicts include accepted copies implicated by another device.
  Missing/duplicate/unknown/wrong-category/discard/replay choices are rejected.
  Completion only records intentions: preservationPerformed=false and
  executable=false; all unresolved concerns remain. Regenerate old v1 templates.

### Latest validation

- **51 Python tests passed**, covering service, backups, startup and recovery.
- **32 recovery tests passed on November 20**, including 12 combined-plan/
  operation-review tests and CLI roundtrips. The 51-test full Python result above is from the
  preceding checkpoint; unrelated suites were not rerun for this isolated tool.
- **19 app tests**, TypeScript, lint and diff checks passed at the preceding
  frontend checkpoint. Subsequent work changed only Python recovery tools/tests
  and documentation; those frontend checks were not needlessly repeated.
- Staging build passed in `/tmp/calendar-checkpoint-build` with the known
  >500 KB bundle warning. Temporary build files may not survive future sessions.
- Live staging assets were not replaced and live services were not restarted.
  The running client does not yet have new export metadata/retry guidance;
  running service processes do not yet have the new sign-in limiter. A future
  controlled activation must preserve drafts, data and service identity.

### Next session — normal use, not more recovery development

1. Let the owner use Calendar normally on iMac and iPad. Basic saved-note sync,
   restart/sign-in startup and automatic backups have already been verified.
2. Address concrete usability problems or failures reported during normal use.
   Do not repeat completed tests or propose another recovery increment by default.
3. Advanced recovery work (verified archive bundles, generalized reconstruction,
   client reconciliation and live cutover) is optional deferred work, not a
   prerequisite for continuing the current test-account note workflow. Resume
   it only at the owner's request.
4. Keep the running Calendar, main/public app, credentials and device trust
   unchanged. Source safeguards not yet activated remain distinguished from
   running behavior; do not claim production authentication or a general live
   restore exists. iPad certificate setup stays deferred.

### Key files and boundaries

- `prototype/sync/recovery_preview.py`: single-device read-only comparison.
- `prototype/sync/recovery_plan.py`: single-device choice template/validation.
- `prototype/sync/recovery_multi.py`: multi-device read-only comparison.
- `prototype/sync/recovery_multi_plan.py`: combined choice template/validation.
- `docs/MULTI_DEVICE_CHOICES.md`: combined-review usage and limits.
- `prototype/sync/test_recovery_drill.py`: synthetic reconstruction fixture.
- `docs/RECOVERY_PREVIEW.md`, `RECOVERY_CHOICES.md`, `MULTI_DEVICE_RECOVERY.md`,
  `AUTHENTICATION_AND_RECOVERY.md`: behavior, commands and remaining limits.
- Account/service provenance is self-reported metadata, not authentication.
  Older exports remain unknown; changed service identity is never auto-rebound.
- Do not modify main/public Calendar, Health Calendar, live notes, credentials,
  power settings or device certificate trust as part of recovery review.
- iPad certificate setup remains deferred. External cloud provisioning is not
  the default next task. Current iCloud copies are backups, not the live sync
  backend; independent database download/restore remains unverified.

## Earlier implementation context — historical

The following sections preserve earlier evidence. Their “pending,” “uncommitted”
and next-step statements are superseded by the current checkpoint above where
applicable.

- The owner decided external cloud storage and a hosted backend are not required at this stage if the current computer-hosted sync meets their needs. Cloudflare/D1 remains an isolated feasibility experiment; do not resume cloud provisioning or identity-provider selection as the default next task.
- The owner subsequently requested that users choose their storage provider and be able to switch later. This is an application requirement, not selection of a particular provider. Keep the free-services-only constraint.
- Storage groundwork, isolated Calendar/computer-sync integration and durable local/computer selection were committed and pushed to `sync-prototype` as `bd6b737`. Physical-device documentation was pushed as ba1cc79. In-page session recovery was committed and pushed as 224d8fc on sync-prototype; its physical-test results were pushed as 716a6c9. Offline-loading/local-HTTPS work was committed and pushed as ed5610b; iPad certificate trust/testing is deferred. Multiple-tab consistency was committed and pushed as b5a7dee; manual records as bdeaf78 and ed0dd2c (controlled resume confirmation). Automatic server backup/recovery was pushed as 9b868e4; selected-destination copy tooling as e7631bd. iCloud Drive is now selected and enabled as recorded below. Main is unchanged. No public application deployment was changed.
- Ordinary Calendar remains local-only. The isolated staging Calendar now enables Settings → This device (pause sync) and Your computer (resume sync), with a per-account durable selection. OneDrive, Google Drive and Dropbox remain unavailable. The integrated Calendar now has automated coverage plus owner-reported computer/iPad Chrome results; older Xiaomi results apply to the standalone editor.
- `src/storage.ts` defines the common local NoteStore interface and provider availability registry; `src/StorageSettings.tsx` renders the panel. `src/useNotes.ts` and `src/NoteHistory.tsx` use that interface. `src/App.tsx` and `src/App.css` include the new panel and styling. Existing IndexedDB data and its database name are preserved.
- `docs/STORAGE_OPTIONS.md` records the remaining requirements: connect providers, show their roles, preview destination data, copy and verify before activation, preserve notes/history/tombstones/pending edits, recover from interrupted transfers, isolate accounts, coordinate tabs, and retain the old provider's data until explicit deletion. Local/computer sync-mode selection is implemented in staging; cloud connectors and provider-to-provider migration are not. Do not describe local/computer selection as finished cloud switching.
- Earlier offline/HTTPS validation: lint, TypeScript, all 17 application tests, all 10 HTTP/HTTPS Python service tests, ordinary/staging builds, the offline/update browser suite and the full sync/session-recovery browser suite passed. The existing large-bundle warning remains. The panel subsequently passed Chrome browser checks and mobile screenshot inspection on 2026-11-17 (see the update below).
- The guided computer/iPad Chrome sequence is complete by owner report: bidirectional edits, pause, paused online reload, resume, unsaved-draft preservation/explicit save, deletion/recovery and offline save/reconnect. See `docs/COMPUTER_SYNC_ACCEPTANCE.md` for precise limits. Integrated Xiaomi testing, production authentication, home-screen installation and cloud migration remain unfinished. Multiple-tab consistency now has automated shared-profile coverage and owner-reported four-tab/iPad acceptance, including a controlled resume-only check completed 2026-11-18. Owner chose to continue developing synchronization rather than merge into main. Session recovery is now physically verified by owner report on computer/iPad Chrome, including real test-session expiry, draft retention through reauthentication, no implicit draft upload and explicit-save convergence. Offline reopening and safe waiting updates are implemented/tested on secure loopback. Local HTTPS is prepared for iPad; explicit user certificate trust and physical offline acceptance remain pending. The user deferred iPad certificate setup after expressing uncertainty and authorized saving this work and proceeding with multi-tab consistency, which is now implemented and tested. Do not ask them to install the certificate again by default. Do not repeat completed basic sync checks by default. Keep the public Calendar and original Health Calendar unchanged unless further authorized.

Later sections preserve earlier work and evidence; this current stopping point supersedes older next-step recommendations to proceed with hosted deployment/authentication.

## Workspace and repository

- Active workspace and Git repository: `/Users/ruixingshi/Python/calendar182`.
- Planning archive: `/Users/ruixingshi/Python/calendar182/calendar`; this handoff is `calendar/HANDOFF.md` relative to the repository root.
- GitHub: https://github.com/shrg182/calendar182 — public, MIT, default branch `main`.
- Live development preview: https://shrg182.github.io/calendar182/.
- Latest application commit: `e9fd87a` (saved-note search). The checkout is now on the separate `sync-prototype` branch (see the sync experiment update below); production `main` remains at e9fd87a. Changes through that commit were pushed; the matching live asset was verified.
- Stack: React + TypeScript + Vite, Node 24/npm. GitHub Actions checks and deploys `dist`; Pages Source is GitHub Actions. Vite base is `/calendar182/`.
- The app display name is **Calendar**; repository name is **calendar182**.

## Owner decisions and boundaries

- Never modify the original `/Users/ruixingshi/Python/health-calendar`, its deployment, database or credentials. It has only been read during this work.
- Preserve verified Health Calendar features. First actual release requires reliable automatic cross-device sync; the current local-notes development preview is not that release.
- Latest successfully server-accepted write wins per record. Use authoritative revisions, operation deduplication, deletion propagation and recoverable superseded versions. Do not use device clocks or download time to decide canonical order.
- No mandatory Supabase dependency. No replacement provider has been selected or connected. Earlier OneDrive suggestions are investigation candidates, not a completed architecture decision.
- Gregorian date cells, Today and note keys follow device civil dates. Chinese lunar labels, traditional festivals and all 24 solar-term labels use the UTC+8 Chinese calendar reference for each selected civil date. Future Shensha timezone settings are separate.
- Header notice must say only **Development preview**. Remove the large introductory heading/tagline.
- Calculation/timezone explanations belong in **Settings → Help**, not day details.
- Narrow outer margins: mobile 4px with safe-area support; desktop 8px and full available width.

## Implemented and deployed

- Combined Gregorian/lunar month view, month arrows, Today, date selection and day details; supported range 1901–2100.
- Find date input and Show date action, including leap-day/range-edge handling.
- Traditional lunar day labels (初二…十一…廿一…三十), month name on 初一, leap-month names.
- All 24 solar-term names and a curated set of lunar/fixed-date festivals; holiday labels precede terms, and collisions show both. Festival labels are not statutory days-off schedules.
- `lunar-javascript` 1.7.8 (MIT), using civil components instead of converting the device instant. Dependency notice ships in `public/lunar-javascript-LICENSE.txt`.
- Daily plain-text notes, explicit Save/Delete, 20,000-character limit, saved-note dots. Dedicated IndexedDB `calendar182.notes.v1` with notes, retained history and ordered durable local outbox; all changes share a transaction. No sync consumer exists yet.
- In-page drafts survive date/settings navigation. Beforeunload protection warns on dirty/busy state; it does not guarantee persistence across closing or reload.
- JSON export includes current/deleted notes, retained versions and local operations. Unsaved drafts are excluded.
- Validated JSON import accepts Calendar182 and older Daymark version 1 backups. Includes size/format/date/text/timestamp/duplicate checks, preview, keep-existing default, explicit replacement, cancel, deletion handling and draft gate. Imports retain source operations as history rather than replaying them; restored records get fresh local operations. Unrelated dates are preserved.
- Note history previews saved text, copies a version into a draft, requires explicit Save, protects dirty text with confirmation, and supports deleted-note recovery.
- Settings saved-note search: case-insensitive local saved text, excludes deleted notes/drafts, newest-date results, first 20 plus total count, result opens its date.

## Validation evidence

- Lint, TypeScript and production builds passed for the implemented changes.
- Twelve unit/storage tests passed at the backup-import stage, including transactions, recovery, invalid input and rollback. Later UI changes passed their targeted browser/build checks; do not claim every test was rerun after every CSS/text edit.
- All 365 lunar dates and all 24 term dates for 2026 match source-derived Hong Kong Observatory fixtures. Tests also passed in Pacific/Honolulu and Pacific/Kiritimati. Full 1901–2100 correctness is not independently established.
- Chrome browser checks passed for mobile/desktop navigation, Settings, date details, leap day, 1901/2100 edges and overflow at 320/390/1280px.
- Dedicated Chrome tests passed for note save/reload, draft navigation, injected storage failure/retry, export/history, delete/reload; import preview/keep/replace/draft guard/rejection; history recovery and dirty-draft protection; saved-note search/open.
- Browser tests use isolated contexts and synthetic data. Real iPhone/Safari and WebKit have not been verified.
- Vite reports a single JS chunk above 500 KB minified (about 177 KB gzip). This is a known performance limitation, not a failed build.

## Commands and tools

From the application checkout:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

With preview running at `http://127.0.0.1:4173/calendar182/`:

```sh
PLAYWRIGHT_PATH=/Users/ruixingshi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/browser.cjs
PLAYWRIGHT_PATH=/Users/ruixingshi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/notes-browser.cjs
PLAYWRIGHT_PATH=/Users/ruixingshi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/import-browser.cjs
PLAYWRIGHT_PATH=/Users/ruixingshi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node tests/history-browser.cjs
```

Local server binding, Chrome launch and network commands may require sandbox escalation. `gh` is unavailable; use Git and GitHub public REST requests with curl for deployment verification. Browser computer-use access was unavailable earlier; repository/browser tests ran through Playwright. Never print credentials.

## Remaining work and next priorities

1. Reconcile/update the feature matrix against current implementations; it is an initial audit, not a current completion dashboard. Finish detailed reference Shensha/test audit.
2. Restore calendar view parity: Year, Week and continuous Days; Gregorian/lunar display preferences; complete GanZhi/solar-boundary/Shensha logic and settings with explicit convention fixtures.
3. Five-language UI: Chinese, English, Japanese, Russian and French. Current interface is English with Chinese lunar/festival labels.
4. Offline/PWA installation, safe update flow, multi-tab consistency and real mobile/Safari validation. Browser-local notes alone do not imply offline app-shell availability.
5. Evaluate a real sync path using current official docs and a bounded isolated prototype. Establish browser authentication, authoritative write order, retry deduplication, incremental reads/traffic, recovery, account isolation, costs and regional reachability before enabling a provider. Validate on two devices before first release.
6. Define history/outbox retention and backup limits; currently there is no automatic pruning. Other tabs do not automatically refresh in-memory notes. Keep browser clearing and plain-text backup privacy clear in Help.

## Documentation locations

- App docs: `/Users/ruixingshi/Python/calendar182/docs/REQUIREMENTS_UPDATE.md`, `ARCHITECTURE.md`, `FEATURE_PARITY_MATRIX.md`, `CALCULATION_CONVENTIONS.md`, `VALIDATION.md`.
- Archived design briefs (relative to the repository root): `calendar/design/CODEX_INSTRUCTIONS.md`, `calendar/design/CALENDAR_SPECIFICATION_AND_AGENTS.md`.
- Archived review: `calendar/review/REQUIREMENTS_UPDATE.md` supersedes earlier sync-later and mandatory-manual-conflict proposals. Old diagrams are historical.
- `calendar/docs/` contains early audit snapshots. Use the repository-root `docs/` for current application documentation; archived claims that implementation has not started describe the earlier audit date.
- `CALCULATION_CONVENTIONS.md` describes the original app; it is not a claim that the new lunar-label engine uses the old algorithm.

No production migration, original-app changes, real cloud sync, optional AI assistant or account integration has been performed.


## Sync experiment update — 2026-11-16

User authorized proceeding with a working two-device prototype. Created and pushed branch `sync-prototype`, commit `4134076`; production main and its deployment are unchanged. The current checkout stays on that branch. No cloud provider or external production data was connected.

- `prototype/sync/server.py`: real Python/SQLite service, serialized server-assigned revisions, immutable account-scoped operation IDs, deduplication, incremental paginated changes, retained tombstones/history, durable service epoch, account-isolated test tokens and expiring HttpOnly/SameSite sessions. Same-origin writes and Host/static-file allowlists. Defaults to loopback. HTTP and test-only authentication; not production-ready.
- `prototype/sync/client/`: isolated test-note editor with its own per-account IndexedDB, transactional notes/outbox, exact-operation acknowledgements, cursor/page transactions, unsaved-draft protection, automatic sync/backoff, recovery and JSON body diagnostics. It never opens production notes storage.
- Six Python service tests passed, including real HTTP authentication, session expiry, account isolation, concurrent serialization, lost-ack retry, restart persistence, 205-record pagination and validation.
- `prototype/sync/two-clients.cjs` passed against a real temporary service using two independent Chrome contexts (desktop and phone viewport), plus another account-isolation context. Verified bidirectional edits, offline late acceptance, draft preservation, delete/recovery, committed upload with dropped response followed by a later competing edit, pending operations after reload and automatic sync. Idle response was 84 JSON body bytes (not billable egress measurement).
- Existing app lint/typecheck, 12 tests and production build also passed. App build bundle remains identical to main. A dedicated GitHub workflow tests the service branch without deploying it to Pages.
- Documentation and manual phone/computer checklist: `/Users/ruixingshi/Python/calendar182/prototype/sync/README.md`. Initial Xiaomi 13/computer LAN checks were subsequently reported successful by the owner; see the physical-device update below for scope and remaining checks. No public cloud hosting, production authentication or live-calendar sync integration has occurred; physical-device acceptance remains partial.
- Local inspection service started on http://127.0.0.1:8790/. Test credentials are in the ignored file `/Users/ruixingshi/Python/calendar182/prototype/sync/.data/test-credentials.json` (do not print or commit them). Both test clients use account-a; account-b verifies isolation. Use one tab per independent browser profile. Service data stays in ignored `.data/`; automated test data was temporary and cleaned up.
- Next: inspect/test with the actual phone and computer using the documented explicit LAN launch (fake notes only), then compare production hosting/provider choices and harden authentication/TLS, retention/backup, multi-tab coordination, outage/rate-limit recovery and regional reachability before integrating real Calendar notes. Do not describe two automated browser clients as two tested physical devices.


## Repository relocation

The application checkout is `/Users/ruixingshi/Python/calendar182`. On 2026-11-16, the owner also moved the former planning workspace into its `calendar/` subfolder. The former sibling path no longer exists. Open the repository root for development and run application commands there, not inside the planning archive.

Git history, branch, ignored prototype credentials/database and dependencies remain in the application checkout. The imported `calendar/` planning archive and README location guide are included in the relocation documentation commit. Finder `.DS_Store` files remain ignored; prototype credentials, database and sessions remain excluded by `.gitignore`. No GitHub or deployment configuration changes are required for this local folder move.

At the earlier application relocation, local services were restarted from the new checkout and the prototype database integrity check returned ok. Those are historical checks, not a guarantee that services are currently running. The documented local URLs remain http://127.0.0.1:8790/ for the sync experiment and http://127.0.0.1:4173/calendar182/ for the calendar preview.

## Physical-device test update — 2026-11-16

Owner-reported manual results using a Xiaomi 13 and computer on the same LAN, account-a, and the isolated sync experiment at `http://192.168.68.58:8790/`:

- Phone-to-computer and computer-to-phone saved edits received successfully.
- Phone offline save followed by reconnection synchronized successfully.
- An unsaved phone draft remained intact when a computer change downloaded; the phone displayed the draft-preservation notice.
- After saving the draft, computer deletion propagated automatically and blanked the phone editor without a manual Sync now action.
- History recovery restored the deleted note, and the owner confirmed restoration propagated in both directions between the phone and computer.
- The owner reported the competing-edit scenario worked as expected: an offline phone edit uploaded after a computer edit became current on both devices, with both texts retained in history.
- The owner reported that the offline-save/reconnect/reload scenario worked as expected: the saved edit survived the phone reload and reached the computer. Whether upload completed before the reload was not independently observed, so pending-outbox persistence across reload remains covered directly by the automated browser test.

These are owner-reported observations, not direct automated inspection of the physical phone. Phone browser/version was not recorded. Earlier automated checks remain separate evidence. The service was subsequently restarted with the same data directory: all 17 accepted operations, the current record, service identity and both unexpired session records were unchanged, database integrity was ok, and the LAN page returned HTTP 200. The owner then confirmed the post-restart test worked as expected: existing device sessions continued working and saved edits synchronized in both directions between the computer and Xiaomi 13. Exact upload timing in the manual reload scenario was not independently observed. Public hosting, production authentication, internet/regional reachability and integration with the public Calendar remain untested or unimplemented.

Separately, the owner confirmed that a note in the public Calendar survived reloading in the same Xiaomi browser. That verifies local persistence only; it does not establish sync for the public application.

## Hosting evaluation update — 2026-11-16

Physical-device test results were committed as `16ff8e3` on `sync-prototype`. See `docs/SYNC_HOSTING_EVALUATION.md` for the researched hosting/authentication shortlist, proposed same-origin HTTPS pilot, and integration prerequisites. The owner subsequently confirmed free services only. Workers Free + D1 Free is the current evaluation candidate; paid hosting is excluded. Provider selection, free authentication and required regions remain unresolved. No paid resource, external identity account or public sync deployment was created.

## Workers/D1 feasibility update — 2026-11-16

`prototype/cloudflare/` now contains a separate local API adapter, schema and nine passing Miniflare D1 runtime tests. Dependencies are isolated from the app; patched transitive dependency overrides installed with zero reported vulnerabilities. The API fails closed outside loopback test URLs and has no production authentication/deploy configuration. The LAN Python service and public Calendar are unchanged. See `prototype/cloudflare/README.md`; next work is free identity selection and synthetic browser integration, followed by remote free-tier verification.

## User-selectable storage update — 2026-11-16

Owner deferred external cloud/backend selection and requested user-selectable storage with later switching. Initial implementation adds `src/storage.ts` (common local NoteStore and availability registry) and Settings storage panel. Local notes/history/backup/import use the common interface. Only This device is available; computer sync remains an isolated prototype and OneDrive/Google Drive/Dropbox are explicitly unavailable. No provider connector, activation/migration flow, deployment or account connection was implemented. This is groundwork, not completion of cloud switching. See `docs/STORAGE_OPTIONS.md` for required verified transfer, rollback, account separation and source-retention behavior. Lint, typecheck, all 13 tests, production build and diff whitespace check passed. Existing bundle-size warning persists. Changes remain local/uncommitted on sync-prototype.

## Local page loading and browser verification — 2026-11-17

Opening repository `index.html` through `file://` cannot run the Vite TypeScript/React entry point. Added a file-only help message with launch instructions and the usual development-server URL; README now explains development/preview serving and origin-specific note storage. No note database was changed or migrated. Production build and whitespace checks passed after this change; the existing bundle-size warning remains.

Started Vite at `http://127.0.0.1:5173/calendar182/`. This is a session-local development process, not an installed startup service; restart with `npm run dev -- --host 127.0.0.1` if needed. Keep the same browser and origin to access previously saved notes.

An isolated temporary Chrome context passed: calendar rendering, hidden file-help on HTTP, five storage entries with only This device active, unavailable options disabled, synthetic note save/reload persistence, no horizontal overflow at 320/390/1280px, and no application page errors. Direct-file opening displayed the help message. Inspected the 320px Settings screenshot: labels and controls remained readable without clipping. Temporary screenshots are `/tmp/calendar182-storage-320.png` and `/tmp/calendar182-storage-1280.png`; verification script is `/tmp/calendar182-storage-check.cjs`. These are temporary artifacts, not committed tests, and no personal browser data was used. No cloud connection, actual provider switching, computer-sync integration or public deployment was added.

## Calendar/computer-sync integration — 2026-11-17

Implemented a separately compiled full Calendar UI connected to the tested Python service. This supersedes earlier statements that all computer sync is confined to the standalone editor: ordinary Calendar is still local-only, while the new isolated staging build now synchronizes. No real notes were copied and no cloud provider was connected.

- Build: `npm run build:computer`; output is ignored `prototype/sync/calendar-dist/`, base `/calendar/`. Normal build/output and GitHub deployment behavior are unchanged.
- Staging modules: `src/ComputerStaging.tsx` and `src/computerSync.ts`. Generated test login gates the Calendar; per-account notes live in `calendar182.computer-staging.v1:<account>`, separate from ordinary notes and the standalone prototype.
- `src/notes.ts` adds staging-only metadata/cursor transactions, exact-operation acknowledgements and pending-date protection. Service identity mismatch blocks uploads/downloads while leaving Calendar available for local backup export. Cryptographically random operation IDs also work on HTTP LAN origins without `crypto.randomUUID`.
- Sync performs bounded uploads/downloads, validates acknowledgements and ordered pages, checks session/account identity, retains history/tombstones, backs off failures, pauses hidden polling and responds to save/reconnection/focus. A request account header prevents a cookie/account change from sending another account's queued notes. Web Locks coordinate sync where available; one tab per browser profile remains required for this experiment. General cross-tab refresh is not implemented.
- Saved text is removed from the in-page draft map after successful saves so future remote edits/deletions become visible. Unsaved drafts remain protected. Original local-only navigation, note persistence/failure/retry, import and history browser suites passed against the running dev server (temporary runner changed only their target port from 4173 to 5173).
- Python service optionally serves only allowlisted staging assets at `/calendar/`; root standalone editor and default service behavior remain available. Added server tests for asset access/path refusal and account-bound writes.
- New `tests/computer-sync.test.ts` covers epoch/account isolation, pending edits vs old acknowledgement, remote tombstones and invalid change pages. All 15 application tests, lint, typecheck and both builds passed. All seven Python service tests passed. Existing bundle-size warning remains.
- `prototype/sync/calendar-clients.cjs` passed with two independent Chrome contexts plus a separate-account context: bidirectional Calendar edits, offline later acceptance, unsaved-draft protection, deletion/recovery, lost-ack retry after a later competing edit, pending uploads across reload, automatic sync, cookie-account mismatch refusal, separate databases and responsive Settings. These are automated browser clients, not physical-device acceptance.
- Downloaded history timestamps are local receipt times in this experiment; server revisions determine accepted order. History/outbox retention, production authentication, disconnect/account-switch UX, PWA/offline app-shell loading and general provider migration are unfinished.

Review service started on `http://127.0.0.1:8791/calendar/`, with its own data directory `prototype/sync/.data/calendar-stage`. Private generated credentials are in `prototype/sync/.data/calendar-stage/test-credentials.json`; use account-a and its token, never print or commit tokens. Restart with `python3 prototype/sync/server.py --port 8791 --data-dir prototype/sync/.data/calendar-stage --calendar-dist prototype/sync/calendar-dist`. This is a session-local loopback process, not a startup service or LAN listener. The old port-8790 service/data was not restarted or modified. Use synthetic notes only with HTTP/test authentication. See `prototype/sync/README.md` and `docs/STORAGE_OPTIONS.md` for commands and remaining limits.

Final review: repeated the full staging browser suite against the final build successfully. Fresh independent desktop (1280px) and mobile (320px) contexts rendered cleanly; viewport screenshots were inspected at `/tmp/calendar182-staging-review-1280.png` and `/tmp/calendar182-staging-review-320.png`. An injected initial IndexedDB-open failure retained the visible retry message. The retained review service still has no synthetic note writes from these visual checks; protocol scenarios used temporary databases.

## Durable local/computer selection — 2026-11-17

The owner asked to proceed. Implemented Settings selection between This device and Your computer in the isolated staging Calendar. This is a synchronization-mode change within the same account/database, not migration to a cloud provider or account logout. Ordinary Calendar still offers local-only storage; cloud choices remain disabled.

- Added `src/computerStorageContext.ts`; `ComputerWorkspace` owns the selected mode and exposes it to StorageSettings and App text. The App remains mounted during changes so unsaved drafts survive.
- `src/notes.ts` stores selection in account-specific IndexedDB metadata under `sync-enabled`, separately from the service epoch/cursor. Selection loads before sync starts. Default is enabled for existing staging accounts.
- Selecting This device waits until no sync is in flight, commits the preference and stops future note uploads/downloads, timers, save/focus/reconnection triggers and manual Sync now. Existing notes, history, pending operations and computer copies remain untouched. Authentication/session requests can still occur on page opening. Selecting Your computer commits the preference and resumes queued edits using existing IDs/cursor.
- The Automatic sync checkbox remains a separate scheduling control: unchecked still permits Sync now, while local-only selection disables both. Fixed its effect scheduling so unchecking does not start an extra run after earlier manual syncs. Controls retain their previous mode if preference persistence fails.
- Lint, typecheck, all 15 application tests, normal/staging builds and whitespace checks passed. Expanded staging storage test covers selection metadata without clearing pending records. The full two-client Calendar suite passed again, including unsaved draft retention across selection, paused save/reload/offline/reconnect with zero note API requests, peer remaining unchanged while paused, successful pending upload on resume and enabled selection surviving reload. Existing large-chunk warning remains. Python service code did not change in this step.
- Review remains `http://127.0.0.1:8791/calendar/` (service was confirmed listening); reload the page to load rebuilt assets. Private test credentials remain at `prototype/sync/.data/calendar-stage/test-credentials.json`. No retained service data was changed by automated scenarios, which used temporary data. No public deployment or cloud connection was made.

Next: physical phone/computer acceptance of these controls, then improve production account/session recovery, offline app-shell support and multi-tab consistency. Provider migration and cloud connector selection remain separate unfinished work. One tab per browser profile and synthetic notes only still apply.

## Physical Calendar test preparation — 2026-11-17

Owner asked to proceed and confirmed Chrome on the Xiaomi 13. Prepared physical-device acceptance, but no phone result has been reported for the integrated Calendar build yet. Checklist/results: `docs/COMPUTER_SYNC_ACCEPTANCE.md` (all physical results pending).

Confirmed computer Wi-Fi IP `192.168.68.58`. Restarted only the port-8791 staging service with `--host 0.0.0.0 --allow-host 192.168.68.58 --port 8791 --data-dir prototype/sync/.data/calendar-stage --calendar-dist prototype/sync/calendar-dist`. The existing staging data directory and credentials were preserved; port 8790 was untouched. LAN and loopback Calendar URLs returned HTTP 200. Service is a session-local process, not installed autostart.

Use `http://192.168.68.58:8791/calendar/` on both the computer and phone, account-a with its private staging token. Different origin from loopback/public Calendar means separate browser storage; do not call missing loopback notes data loss. Use fake notes, one tab per profile, same home network and an awake computer. Next user-facing step: open/login on both devices, save a synthetic computer note on 2026-11-17 and confirm it reaches the phone. Then run the remaining checklist incrementally. Record actual owner observations; never mark physical acceptance complete from automated checks or an HTTP 200 alone.

## iPad Chrome reachability — 2026-11-17

Owner reported port 8790 was unreachable on iPad Chrome. Inspection found no listener on 8790 and a LAN listener on 8791. Computer Wi-Fi remained `192.168.68.58`; current Calendar returned HTTP 200 at both loopback and LAN URLs. After using `http://192.168.68.58:8791/calendar/`, the owner confirmed "It works." Record as iPad Chrome page reachability only; sign-in, note sync, pause/resume and Xiaomi checks remain pending. Next: sign in as account-a on both devices, save a synthetic note on the computer and confirm it appears on iPad.

## Computer-to-iPad sync observation — 2026-11-17

After the account-a computer/iPad sign-in and computer-save instructions ("Computer test 1", 2026-11-17), the owner reported "It works as expected." Computer-to-iPad saved-note synchronization is therefore owner-reported successful for the integrated Calendar on port 8791, using iPad Chrome. Reverse iPad-to-computer edits, pause/resume, draft/recovery and Xiaomi acceptance remain pending. Next instruction: edit/save the same date on iPad, then verify it appears on the computer. Updates since commit bd6b737 are local documentation changes unless separately committed.

## Bidirectional iPad sync observation — 2026-11-17

Owner confirmed "It works as expected" after editing/saving "iPad test 2" for 2026-11-17 on iPad and checking the computer. Combined with the preceding report, integrated Calendar computer↔iPad Chrome saved-note synchronization is owner-reported successful. Do not mark all physical acceptance complete. Next: on iPad choose Settings → This device, save "iPad paused test 3", verify the computer stays at "iPad test 2"; then test paused reload and resume incrementally.

## iPad pause observation — 2026-11-17

Owner reported that after the instructed iPad local-mode save and a 20-second wait, the computer stayed unchanged. Paused non-propagation is owner-reported successful; exact iPad saved text and disabled control were not separately reconfirmed. Next: reload iPad while connected, confirm Settings still selects This device and 2026-11-17 still shows "iPad paused test 3", with the computer unchanged. Resume is not tested yet.

## iPad paused reload observation — 2026-11-17

Owner confirmed that reloading iPad Calendar retained This device selection and the unchanged November 17 note; computer remained unchanged. Online reload persistence and continued non-propagation while paused are owner-reported successful. Next: iPad Settings → Your computer, then verify the saved paused note reaches the computer within approximately 20 seconds. Resume and remaining physical scenarios are still pending.

## iPad resume observation — 2026-11-17

Owner reported that after selecting Your computer on iPad, the computer quickly showed the updated iPad text. Physical local/computer mode acceptance now covers bidirectional computer↔iPad Chrome saved edits, pausing with no propagation, online reload retaining selection/note and successful pending upload on resume. This does not establish all remaining scenarios or Xiaomi acceptance. Next: test an unsaved draft surviving Settings/local-computer selection, followed by explicit Save and convergence. Documentation changes since bd6b737 remain uncommitted unless subsequently saved by the owner.

## iPad draft preservation observation — 2026-11-17

Owner answered yes to the draft-preservation check after switching This device → Your computer: iPad unsaved text remained and computer saved text was unchanged. Storage selection therefore did not implicitly save/upload the draft. Next: explicitly Save note on iPad (Your computer selected) and verify the computer receives "Unsaved draft test". Physical delete/recovery and offline save/reconnect remain pending.

## iPad explicit draft save observation — 2026-11-17

Owner confirmed "Unsaved draft test" appeared instantly on the computer after explicitly saving on iPad. Draft retention, no implicit upload during mode selection, and subsequent explicit-save convergence are owner-reported successful. Next: delete the synthetic November 17 note on iPad and confirm computer blanking; then separately recover via Note history → Use this version → Save note. Offline save/reconnect remains pending.

## iPad deletion observation — 2026-11-17

Owner initially erased editor contents and saw Save note disabled; explained that deleting a saved record requires Delete note and confirmation. In response to that instruction and computer-blanking check, owner reported "The computer changes quickly." Record as owner-reported deletion propagation, not completed history recovery. Next: on iPad open November 17 Note history, select "Unsaved draft test", Use this version, then Save note; confirm the computer receives the restored text.

## iPad recovery observation — 2026-11-17

Owner confirmed expected behavior after restoring "Unsaved draft test" through Note history → Use this version → Save note and checking the computer. Physical deletion/recovery with synchronized restoration is owner-reported successful. Next: with Your computer selected and the page already open, disconnect iPad Wi-Fi (ensure no alternate connection), save a synthetic offline edit, verify computer unchanged, then reconnect and confirm convergence. Do not reload offline: the app shell is not yet available offline.

## Guided iPad sequence complete — 2026-11-17

Owner reported "It works as expected" for offline save/reconnect: with the page open and Your computer selected, save "Offline iPad test" while disconnected, confirm computer unchanged, then reconnect and confirm computer receives it. The guided physical computer/iPad Chrome sequence is now complete by owner report. Consolidated checklist covers bidirectional edits, local-mode pause, paused online reload, resumption, unsaved draft retention/no implicit save, explicit Save propagation, deletion/recovery and offline save/reconnect. Do not generalize to production readiness, Xiaomi or offline app-shell reload. Precise untested details are in `docs/COMPUTER_SYNC_ACCEPTANCE.md`.

Implementation commit `bd6b737` is on `sync-prototype` and tracks `origin/sync-prototype`. Physical-test documentation accumulated after that commit and is not yet committed/pushed. No implementation tests were rerun for these documentation-only observations.

## Physical-test documentation repository update — 2026-11-17

Owner authorized proceeding after the guided iPad sequence. This documentation-only update preserves the acceptance checklist, validation evidence and current handoff on sync-prototype. Implementation remains bd6b737; no code, credentials, test databases, main-branch files or public deployment were changed. Earlier entries describing uncommitted observations are historical. No application test rerun is needed for these documentation-only changes; whitespace and staged-file checks are the relevant verification.

## In-page session recovery — 2026-11-17

After discussing main/public deployment, the owner explicitly chose "Continue developing synchronization." Remain on sync-prototype; do not merge or deploy main. Implemented same-account reconnection for the isolated Calendar without reloading/unmounting App, preserving unsaved drafts and the durable local outbox.

- `ComputerApiError` carries HTTP status; 401 stops sync scheduling/retries and shows Reconnect same account above Calendar. An incorrect token clears the input and displays an error. Tokens remain transient form state.
- Reauthentication posts only the current account, then verifies both account and service epoch. It cannot switch accounts or silently bind an old outbox to a replacement service. Changing service identity retains pending data and instructs backup/investigation.
- Successful reconnection resumes saved edits if computer mode is enabled. Selecting local-only while authentication is missing, then reconnecting, remains paused until explicitly enabled. App stays mounted; no draft is implicitly saved.
- Unit guard covers changed account/epoch. All 16 application tests, lint, typecheck and normal/staging builds passed; existing large-chunk warning persists. Ordinary build asset hash remained unchanged from before this step. Python service code/tests were not changed or rerun.
- Expanded `prototype/sync/calendar-clients.cjs` passed the complete existing suite plus session recovery. It simulated missing authentication by clearing one test browser's cookies: queued saved edit + unsaved draft retained; focus/reconnection events caused no authenticated note retries; other-account token rejected/cleared; correct token uploaded the saved edit without uploading/replacing the draft; explicit draft save synchronized; cookie-account mismatch stayed isolated; reconnecting in local-only mode remained paused until explicitly enabled. Separate unit guards reject account/epoch changes. These are automated browser checks, not new physical-device acceptance or production authentication.
- Inspected desktop reconnect/error screenshot `/tmp/calendar182-reconnect.png`; form and error remained readable. The retained LAN staging service continues serving rebuilt assets; reload only after preserving any current unsaved draft. No service restart or retained test-note writes were needed.

Changes are local/uncommitted after ba1cc79. Next review the recovery UX on iPad without repeating completed basic sync acceptance, then save the implementation on sync-prototype. Full-page reload while unauthenticated, offline app-shell loading, production accounts, logout/account migration and general multi-tab consistency remain unfinished.

## Session-recovery repository update — 2026-11-17

Owner authorized proceeding after the completed session-recovery implementation/tests. Preserve the eight reviewed implementation, test and documentation files on sync-prototype with commit subject `feat: recover computer sync sessions without losing drafts`. The preceding local/uncommitted descriptions refer to the development checkpoint before this repository update. No main merge, public deployment, server credential/data change or new physical-device acceptance is part of this update. Next review the recovery form on iPad; existing basic sync acceptance need not be repeated.

## Physical reconnect check in progress — 2026-11-17

Following commit 224d8fc, owner asked to test reconnection on iPad. Instructed save/reload, Your computer + automatic sync, then type "Reconnect draft test" on November 17 without saving. Owner replied Ready. Expired five active account-a sessions only in `prototype/sync/.data/calendar-stage/sync.sqlite3` by setting expires=0; accepted-operation count was unchanged. The old experiment/production notes were not touched. Both staging devices using that account may now require reconnection.

Await owner confirmation that iPad displays the reconnect form while retaining the unsaved draft. Do not reload the iPad or claim physical recovery has passed. Then reconnect the same account with its private token, check draft retained and no implicit draft upload; explicit Save can follow. This controlled expiration is a test action, not data deletion.

## iPad expired-session draft observation — 2026-11-17

After controlled account-a staging session expiration, owner confirmed seeing Reconnect same account. Asked to inspect the note without reloading, owner reported its text was unchanged. Record as owner-reported reconnect-form appearance and preservation of the prepared unsaved draft after real session expiry. Actual reauthentication and post-reconnect draft preservation remain pending. Next: enter the private account-a token on iPad, reconnect without reloading/saving, confirm form disappears and note remains. Computer account-a session was also expired and may need reconnection before any cross-device verification.

## iPad same-account reconnection observation — 2026-11-17

Owner confirmed that entering the private account-a test token and tapping Reconnect same account made the form disappear while the note contents remained unchanged. Owner-reported physical expiry/reconnect now covers form appearance and unsaved-draft retention before and after reauthentication without reload. Do not claim post-reconnect explicit Save convergence yet. The computer's account-a session was also expired; next reconnect it, confirm its saved text still excludes the unsaved iPad draft, then explicitly Save note on iPad and confirm propagation.

## Physical reconnect sequence complete — 2026-11-17

After computer reauthentication the owner confirmed its saved text was unchanged, excluding the unsaved iPad draft. Following the explicit Save note instruction on iPad, owner reported expected propagation of "Reconnect draft test" to the computer. The guided real-expiry recovery sequence for 224d8fc is complete by owner report: form appearance, draft retained before/after iPad reconnection without reload, no implicit draft upload after computer reconnection, then explicit-save convergence.

No implementation changes or test reruns were needed; only HANDOFF, COMPUTER_SYNC_ACCEPTANCE and VALIDATION documentation changed. These updates remain uncommitted after 224d8fc. Next save these results on sync-prototype, then develop offline app-shell support or multi-tab consistency. Main/public deployment and cloud-provider selection remain unchanged. Physical wrong-token/local-only reauthentication tests, full-page unauthenticated reload recovery and Xiaomi checks are not established by this sequence.

## Recovery test documentation repository update — 2026-11-17

Owner authorized saving the completed physical session-recovery results on sync-prototype. This documentation-only update includes HANDOFF, COMPUTER_SYNC_ACCEPTANCE and VALIDATION; implementation remains 224d8fc. Earlier uncommitted references describe the test-recording checkpoint. No application code, credentials, database contents, main branch or deployment changes are part of this repository update. Whitespace/staged-file review is sufficient; no implementation tests were rerun.

## Offline app loading and local HTTPS — 2026-11-17

Owner authorized offline app-shell work. Implemented it only for the isolated staging build; main/public build remains unchanged. Source changes are currently uncommitted after 716a6c9.

- Vite post-build plugin emits a content-versioned `offline-worker.js` only with VITE_COMPUTER_SYNC=1. `tools/offline-worker.js` precaches the shell/generated assets/favicon/license, never API data or credentials. Versions wait for all old tabs to close; no skipWaiting/forced reload. Failed installs discard their incomplete cache, and activation cleans only this app's obsolete shell caches without touching IndexedDB.
- `src/OfflineStatus.tsx` shows ready/update status on secure origins and honestly explains HTTP LAN cannot reopen offline. Update instructions require saving drafts, closing Calendar tabs, then reopening; unsaved drafts are still not persisted across intentional close/reload.
- `src/rememberedComputer.ts` stores only validated last-confirmed account/service labels in `calendar182.computer-device.v1`, never tokens. Failed/expired startup can open account-local saved notes without server authentication; same-account/epoch verification is mandatory before uploading pending edits. Network return/focus or Check computer connection restores a valid session, otherwise the reconnect form is available. Local-only mode stays paused. First use still needs a connected sign-in.
- Extended Python server to allow the worker and optional local HTTPS. Correct scheme is required for Origin; HTTPS uses a distinct Secure/HttpOnly/SameSite cookie so the old HTTP cookie remains independent. Public certificate/profile routes serve only parsed certificate bytes, not key files.
- Added `prepare_local_https.py`: local 365-day CA + 90-day server cert (SANs current LAN IP, 127.0.0.1, localhost), owner-only keys under ignored `.data/local-https`, and a one-certificate iPad profile with no MDM/VPN payloads. Existing keys are preserved. No system/browser/device trust setting was changed. Certificate/profile/key paths are ignored by Git.
- Prepared CA fingerprint and user trust/removal instructions are in `docs/OFFLINE_LOADING.md`. Installing/trusting it on iPad is an explicit user step. Asked asynchronously whether the user wants iPad HTTPS guidance or localhost-only testing; do not infer trust approval from silence.
- Retained services now run HTTP `http://192.168.68.58:8791/calendar/` and HTTPS `https://192.168.68.58:8792/calendar/`, sharing the existing staging server database/account tokens. Public profile `http://192.168.68.58:8791/calendar/local-ca.mobileconfig`; raw certificate `/calendar/local-ca.cer`. Both endpoints were refreshed with final server code. HTTPS verified using explicit CA with normal certificate/hostname verification; profile HTTP 200 and payload checked against prepared certificate. No insecure browser flags used. These remain session-local LAN processes, not autostart/public hosting.
- HTTPS is a separate browser origin: HTTP local notes/drafts/outbox are not moved or cleared; accepted synthetic server records download after HTTPS sign-in. Do not reload HTTP while an unsaved draft is present. iPad Chrome needs trusted HTTPS before service workers; the old HTTP address cannot prove offline reload.
- All 17 unit tests, lint/typecheck, ordinary/staging builds passed. Normal build still has the same JS asset as before this task and does not emit/register the offline worker. Existing large-chunk warning remains. All 10 Python tests passed, including inherited protocol/auth/asset checks over TLS, trusted/untrusted certificate behavior, Secure cookie, Origin enforcement, and public certificate/profile payload checks.
- New `prototype/sync/offline-clients.cjs` passed in isolated real Chrome workers/temp service data: offline reload/edit/reload/reconnect, no API in Cache Storage, saved local access after expired-auth reload, failed cache-install rollback, waiting update with two tabs + draft, saved note retained across activation, and updated shell reopening offline. Existing full sync/session-recovery suite passed after adapting its specific sync-panel selector for the extra banner. Screenshot `/tmp/calendar182-offline.png` inspected. These are automated loopback results, not physical iPad offline acceptance.

Next: if user elects to trust the prepared certificate, guide profile install and full-trust setting using Apple instructions, then first HTTPS login/cache-ready and incremental iPad offline tests. Otherwise keep secure-loopback testing and document physical limitation. Do not install device/system root trust automatically. Full PWA/home-screen installation, general multi-tab consistency, production auth and cloud migration remain unfinished.

## Offline checkpoint and next scope — 2026-11-17

User answered "No idea" to certificate-trust guidance. Recommended deferring installation and keeping existing HTTP sync; user then authorized "Please proceed" with saving offline work and developing multiple-tab consistency. No certificate trust approval is present. Preserve tested offline/optional-HTTPS implementation on sync-prototype; no main merge/public deploy. The next step was implementing account/database-scoped cross-tab refresh, draft preservation and sync/mode coordination; this is now covered by the multiple-tab update below. Do not claim existing independent-browser tests establish multiple-tab behavior.

## Multiple-tab implementation — 2026-11-17

Owner authorized saving offline work and continuing with multiple-tab consistency. Offline checkpoint ed5610b was pushed first (19 source/test/doc files; no certificates, keys or data). Multiple-tab changes are preserved as a separate tested implementation checkpoint on sync-prototype. Main/public deployment is unchanged.

- `src/storageSignals.ts`: account/database-scoped post-commit hints via BroadcastChannel + deduplicated storage events, with focus refresh and visible five-second polling if BroadcastChannel is absent. Signals carry no note text or tokens, and IDs/timestamps do not determine note order.
- Notes, delete/import, remote pages and mode changes publish only after transaction completion. useNotes rereads saved data while retaining drafts; App shows a peer-change notice for a dirty draft. NoteHistory refreshes while preserving selected versions. Ordinary local Calendar gets this tab refresh too, with the same database name.
- `computerLock.ts` scopes Web Locks to the database; both sync and mode writes use it. No-lock origins use server deduplication, exact acknowledgements, per-request stored-mode checks and transactional cursors. Already-sent requests can finish after pause; new requests check the shared preference. Stale completed pages are ignored rather than rolling back the cursor/tombstone; sync resumes from the latest committed cursor.
- All tabs for the same account/browser/origin refresh their local/computer selection, saved data and history. New tabs read the selection. Reconnection emits a non-secret same-account hint; peers verify their cookie/epoch before resuming and preserve drafts. Different-account tabs cannot upload through another account's cookie. No permanent leader or new backend protocol is required.
- `prototype/sync/multiple-tabs.cjs` passed in real shared-profile tabs + independent peer, with BroadcastChannel/Web Locks and with those APIs deliberately absent: saves/history/draft protection, deletion, concurrent writes/sync without duplicate accepted operations, peer-download fan-out, shared pause/resume/new tab, uploader close after commit before ack with later competing remote write, cross-tab session recovery, and account isolation. These are automated browser results, not physical-device acceptance.
- Lint/typecheck, all 17 application tests, ordinary/staging builds and diff check passed. Unit coverage now includes stale page vs newer tombstone/cursor. Independent-device sync/session suite, offline/update suite and ordinary navigation/notes/import/history browser suites passed. Python service code did not change and was not retested in this step. Large-bundle warning remains.
- HTTP staging serves rebuilt assets without a restart; save current drafts before reloading old tabs. Cached secure-origin builds use the existing waiting-update instructions. Current docs: docs/MULTIPLE_TABS.md, STORAGE_OPTIONS, VALIDATION and prototype/sync/README.md. The standalone editor still has its old one-tab limitation.

Next: preserve multiple-tab implementation on sync-prototype and optionally guide a simple same-browser two-tab acceptance check, without repeating basic independent-device tests or asking again to install iPad certificates. Physical iPad offline/HTTPS remains deferred. Production accounts, history/outbox retention, home-screen installation and provider migration remain unfinished.

## Multiple-tab repository checkpoint — 2026-11-17

After all relevant checks passed, preserve the completed tab implementation/tests/docs with commit subject `feat: keep Calendar tabs consistent without losing drafts`. Offline prerequisite ed5610b is already pushed. This checkpoint includes only application/test/documentation changes; no generated keys, certificates or test data. Main/public deployment and device trust settings remain unchanged. Earlier local/uncommitted references describe the development checkpoint. Next optional physical check: save/reopen two same-account tabs in the existing HTTP Calendar, verify saved-note fan-out, draft preservation and shared local/computer selection.

## Manual shared-tab acceptance started — 2026-11-17

Owner authorized proceeding after b5a7dee was pushed. Confirmed HTTP staging listener on port 8791 and clean working tree, then instructed two same-profile computer Chrome tabs, account-a, November 17, save "Shared tab test 1" in Tab 1. Owner reported four tabs showed that text without reload or Sync now. Record as successful owner-reported four-tab saved-note fan-out; device/browser identity was not restated in the response. Next: leave an unsaved draft in Tab 2, save different text in Tab 1 and verify draft retained only in Tab 2 while other tabs receive the saved text. Do not claim all manual multi-tab acceptance complete. Certificate setup remains deferred.

## Manual four-tab draft observation — 2026-11-17

Owner confirmed expected behavior for the prepared Tab 2 unsaved draft vs Tab 1 saved change: Tab 2 kept "Private draft in Tab 2", while the other three tabs showed "Shared tab test 2". This establishes owner-reported draft preservation without implicit save during peer updates. Next: explicitly Save note in Tab 2 and verify all four tabs converge to that text; then test shared local/computer selection. Manual results remain documentation-only changes after b5a7dee.

## Manual four-tab explicit-save observation — 2026-11-17

Owner confirmed expected four-tab convergence after explicitly saving "Private draft in Tab 2". Manual shared-tab checks now cover saved-note fan-out, unsaved draft preservation during peer changes, and explicit-save convergence. Next: select Settings → This device in one tab and confirm all four tabs reflect local-only mode with Sync now disabled. Then resume via another tab. Certificate trust remains deferred.

## Manual shared-pause observation — 2026-11-17

Owner confirmed selecting This device in Tab 1 updated all four tabs and disabled Sync now in each. Next: while still paused, save a synthetic note in one tab and check it appears across local tabs but not on the independent iPad/browser; then select Your computer in a different tab and verify all tabs resume and the independent device receives the pending edit. No new device trust is needed.

## Manual paused-local-sharing observation — 2026-11-17

Owner confirmed "Four tabs paused test" saved in Tab 1 appeared across the four local tabs while the independent iPad remained unchanged, under the instructed computer-sync-enabled iPad condition. Shared local data and paused outbound propagation are owner-reported successful. Next: in Tab 2 select Your computer, confirm all four tabs reflect it with Sync now enabled once idle, and verify the iPad receives the saved paused text.

## Four-tab resume/iPad delivery investigation — 2026-11-17

Owner reported iPad did not show the paused-test text after the resume instruction. Read-only diagnostics initially showed no marker accepted and current November 17 revision 18; subsequent checks showed marker accepted and current at revision 20, not deleted. No service restart, forced sync, note mutation or code change was made. The delay/intervening user actions are unknown. Source upload has now reached the server; iPad receipt is pending. Async question asks all-four selection and exact Tab 2 sync status. Latest instruction: keep iPad Calendar visible up to 20 seconds, then tap Sync now if absent and report its status, without reloading or clearing its note. Do not assume a client bug or mark physical resume complete yet.

## Four-tab/iPad final observation — 2026-11-17

Owner reported that after saving the text in Tab 2, all four tabs and iPad showed the same text. Answered yes to the async all-four Your computer selection question; exact status was not provided. Post-resume explicit-save convergence is owner-reported successful. No implementation change was required or made. Do not label the earlier resume-only delay as fixed or fully explained: the extra Save prevents an isolated conclusion about automatic upload of the original paused operation. Automated resume coverage remains separate.

Manual multiple-tab checks now cover four-tab saved refresh, draft privacy during peer writes, explicit-save convergence, shared local-only settings/disabled controls, local sharing with no iPad propagation while paused, shared resume selection and final four-tab/iPad convergence after Save. Results in HANDOFF and MULTIPLE_TABS remain local/uncommitted after b5a7dee. Next preserve these observations; optionally isolate resume-only behavior later if needed, without treating it as an established code defect.

## Manual tab-record checkpoint and controlled resume scope — 2026-11-17

Owner authorized the proposed next steps: preserve the manual four-tab records, then isolate resume-only delivery before moving on to backup/recovery. This documentation checkpoint includes HANDOFF, MULTIPLE_TABS and VALIDATION only, on sync-prototype. Earlier uncommitted/pending observations are historical. No code, credentials, data, main branch or deployment change is part of the checkpoint.

Next controlled test, not yet performed: in computer Tab 1 select This device; on November 17 replace the test note with "Resume-only check 1" and explicitly Save. Require confirmation of the Saved on this device status and local-tab visibility before resuming. Then select Your computer from Tab 2 with automatic sync enabled on the receiving iPad; do not Save again, reload or press Sync now during the observation. Inspect server acceptance read-only to distinguish upload from download if needed. Keep iPad visible and confirm exact text. Do not mark this isolated scenario passed before observing it.

## Resume-only controlled check awaiting iPad view verification — 2026-11-17

Manual records were pushed as bdeaf78, then instructed Tab 1 This device + explicit saved "Resume-only check 1" on November 17 before any resume. Owner reported all four tabs and iPad showed it. Owner separately confirmed computer Tab 1 still selects This device. Read-only checks show no marker accepted anywhere in staging changes (also compared without spacing/punctuation); latest server revision 21, integrity ok. No pause-bypass defect is established: source/server evidence is consistent with pause, while iPad display report needs verification. Next ask for the iPad page address and exact November 17 note text without reloading/editing. Keep sync paused and retain drafts. The controlled resume test remains pending; no code or data mutation was made.

## Controlled pause setup confirmed by corrected observation — 2026-11-17

Owner clarified the iPad did not change and the prior report was a misreading. This resolves the initial paused-save discrepancy without a code/data change. Tab 1 is This device, saved marker is "Resume-only check 1", local save status was reported, local tabs show the edit, and server had no matching marker. Next: select Your computer in computer Tab 2, leave the iPad visible with its computer/automatic sync enabled, and observe up to 20 seconds without saving again, reloading or Sync now. Confirm exact iPad note text. Automatic resume delivery remains pending.

## Controlled resume-only result complete — 2026-11-18

Owner replied "Yes, it shows the same" after the explicit instruction to resume from computer Tab 2 and observe the iPad for "Resume-only check 1" without another Save, reload or Sync now. Record as successful owner-reported automatic pending-edit delivery on resume. The earlier paused iPad-change report was a misreading corrected by the owner; no pause bypass or code defect was established and no code fix was made. The first uncontrolled delay remains unexplained, but the new controlled scenario passed.

Guided manual four-tab acceptance now covers saved-note refresh, private draft protection, explicit-save convergence, shared pause settings/disabled controls, saved local sharing with iPad unchanged while paused, and resume-only iPad delivery. New observations are uncommitted documentation changes after bdeaf78. Next preserve these records on sync-prototype, then develop automatic server-database backups and a tested restore path as previously recommended. Do not repeat the completed resume test, merge main, or revisit deferred iPad certificate trust by default.

## Work resumed — 2026-11-19

Owner authorized continuing: preserve the completed controlled resume observations on sync-prototype, then implement automatic SQLite snapshots and non-destructive restore drills. Do not overwrite the live service/database during recovery testing. Main/public deployment and deferred iPad trust remain unchanged.

## Automatic database snapshots and safe restore — 2026-11-19

Owner asked to continue. Resume-test docs were first committed/pushed as ed0dd2c. Implemented `prototype/sync/backups.py`, `test_backups.py`, service scheduling and BACKUP_RECOVERY.md. No frontend code/schema or main/public deployment changed.

- CLI service defaults to snapshots about hourly (3600s), up to 168 retained; worker checks on startup and at most minute intervals. Flags --backup-interval / --backup-keep; interval 0 disables. Factory tests opt in explicitly. Session-local service must be running/awake; no OS startup scheduler installed.
- SQLite online backup API, verified integrity/current-vs-accepted-history, cleared snapshot sessions, owner-only files/directories, fsync+atomic rename before pruning strictly generated files. Process flock+recent-snapshot checks coordinate HTTP/HTTPS. Failed snapshots retain older files and retry without breaking saves. Same-disk only; independent destination and richer monitoring remain future work.
- Restore refuses any existing destination and never replaces live data. Verified copy gets a new service epoch and no sessions; preserved immutable IDs/revisions, history and tombstones retain original retry acknowledgements. Credentials/keys are not included. Real cutover/client reconciliation remains manual; retain/export original client outboxes and drafts rather than clearing them to bypass identity mismatch.
- All 16 Python tests (six backup tests + ten service tests) passed. Backup tests reran after final cadence adjustment. Shared-tab suite passed with automatic startup snapshots in both secure-API and no-lock/no-BroadcastChannel branches. Lint/diff checks passed. No frontend tests/builds rerun because client code was unchanged.
- Actual retained-data snapshot: `.data/calendar-stage/backups/calendar182-20261119T153619671190Z-29a6a8bd.sqlite3`; restore drill: `.data/restore-drill-20261119-dffa01e5`. Verified 25 operations/one current record, rotated restore epoch, empty restored sessions; live epoch/operation/session counts unchanged. Ignored evidence: `.data/calendar-stage/last-backup-drill.json`. No live restore was performed.
- Restarted both HTTP 8791 and optional HTTPS 8792 with the same staging data, certificate paths and default backup scheduling; both returned HTTP 200 (HTTPS validated using explicit CA). Post-restart epoch matches snapshot and operation counts remain 25. No sign-ins were deliberately expired, and no certificate trust was changed. Backups/drill data are ignored and not served.

Current docs: docs/BACKUP_RECOVERY.md and prototype/sync/README.md. Preserve this tested checkpoint on sync-prototype. Next choose an independent backup destination if desired, and improve backup monitoring/client reconciliation before production use. iPad certificate setup stays deferred; do not merge main or repeat completed manual tests.

## Destination-copy preparation — 2026-11-19

Owner asked to proceed with off-computer backup copies. Read-only inspection found a local OneDrive folder but no mounted external drive (do not use /Volumes/.timemachine). Asked asynchronously which root to use: existing OneDrive, external drive, or a supplied path. No answer/destination is present yet. Do not select a provider or copy readable note snapshots outside the project without that choice.

Implemented optional verified bundle export in `backup_copies.py`, CLI copy/verify-copy and bundle-aware restore, plus --backup-copy-root for optional periodic latest-snapshot copying. It is disabled by default. Existing roots only; target subfolder Calendar182Backups, per-snapshot database + SHA-256/count manifest, verified temp copy then publish, idempotent identical copies, no overwrite of conflicting copies, no automatic external pruning. Missing/unavailable roots leave local backups running and retry later. Local filesystem verification is not proof of cloud upload or off-computer recoverability.

Five new copy tests and the six existing backup tests passed using synthetic notes/temp folders. All 21 Python service/backup/copy tests and lint/diff checks passed; no frontend code changed. Current work remains local/uncommitted after 9b868e4. Docs: BACKUP_COPIES.md and BACKUP_RECOVERY.md. No actual OneDrive/external copy or configuration was made. Next obtain destination choice, verify specific root and request needed filesystem permission only for the concrete selected copy, then checksum and restore a retained-data snapshot from it into a new ignored drill directory. No main/deployment/trust changes.

Destination-copy implementation is preserved as a tested, disabled-by-default checkpoint with commit subject `feat: prepare verified copies to a selected backup folder`. No provider/path choice or real external copy is implied by that checkpoint. Await the pending destination question.

## iCloud Drive selected and enabled — 2026-11-19

Owner indicated they often use iCloud Drive. Used its existing root `~/Library/Mobile Documents/com~apple~CloudDocs`, dedicated Calendar182Backups subfolder, with concrete external-folder copy approved through the filesystem tool. Do not use OneDrive; no new cloud account/backend was selected.

- Created fresh verified local snapshot `calendar182-20261119T161642588269Z-e25adc78.sqlite3` with 25 operations/one current record, copied to the iCloud folder as a checksum/database-verified bundle.
- Restored that bundle into ignored `.data/icloud-restore-drill-20261119-7efbc388`: counts match, epoch rotated, sessions empty; live epoch/operation/session counts unchanged. No live restore or browser-data clearing.
- Targeted Foundation URLResourceValues reads reported BOTH manifest.json and snapshot.sqlite3: isICloud true, uploaded true, uploading false, no upload error/conflict. This confirms macOS-reported upload, not independent device download/restore. No unrelated cloud documents inspected. Temporary metadata helper `/tmp/calendar-icloud-status.swift`; official Apple API linked in BACKUP_COPIES.md.
- Restarted retained HTTP 8791 and optional HTTPS 8792 using their same options plus `--backup-copy-root '/Users/ruixingshi/Library/Mobile Documents/com~apple~CloudDocs'`. Both returned 200, HTTPS using explicit CA validation. Shared copy lock prevents duplicate workers; periodic latest-copy retries are enabled. No device trust settings changed.
- Ignored selection/evidence: `.data/calendar-stage/backup-copy-config.json`, including uploaded confirmation source and independent_device_restore_verified=false. This record is not auto-loaded by the server; manual restart commands must include --backup-copy-root. No OS autostart installed. Destination copies are not automatically pruned; local snapshot retention remains 168.

Docs updated: BACKUP_COPIES, BACKUP_RECOVERY, VALIDATION and HANDOFF. No implementation source changed, so no test rerun; local copy/restore and actual service availability are the relevant checks. Preserve these setup records on sync-prototype. Next optional check: user opens iPad Files → iCloud Drive → Calendar182Backups and checks bundle/manifest availability. Do not overstate remote restore readiness or revisit deferred certificate setup. Main/public Calendar remains unchanged; computer-hosted sync still handles live synchronization independently of iCloud backups.

## iPad iCloud folder observation — 2026-11-19

Setup docs were committed/pushed as 4529d54; working tree was clean before this observation. Owner confirmed Calendar182Backups is visible in iPad Files/iCloud Drive ("See it"). Record folder visibility, not independent database download/restore. Next ask to open the bundle ending e25adc78 and manifest.json, checking operations 25 / records 1. Ignored backup-copy-config.json now includes ipad_folder_seen=true; independent_device_restore_verified remains false.

## iPad iCloud manifest read verified — 2026-11-19

Owner supplied manifest JSON from the selected iPad bundle: expected format, operations 25, records 1, SHA-256 5469c09d5fe92314c8932b55db26a55bf2c6ef2c1a8f7bf7f24fe91e779c6541. Mac re-verification of the copied database matched exactly and counts validated. This establishes independent-device manifest readability, not an independent database download/restore. Local evidence now records ipad_manifest_read=true and matching checksum; independent_device_restore_verified remains false.

Folder + manifest observations are uncommitted docs after 4529d54. Next preserve verification records; the iCloud copy setup, checksum/local restore drill, OS upload status and iPad manifest access have all been checked. Do not require SQLite tools on iPad or claim an iPad restore. Main and deferred device trust remain unchanged.

## iCloud verification repository checkpoint — 2026-11-19

Owner authorized preserving the iPad folder/manifest verification. This documentation-only update records the checksum/count match and accurately separates local restore, OS-reported upload and iPad manifest access. No snapshots, configuration, keys, credentials or note contents are staged. Earlier uncommitted references describe the observation checkpoint. Main/public deployment remains unchanged.
