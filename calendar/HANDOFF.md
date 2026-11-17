# Calendar182 handoff

Updated: 2026-11-17 (America/Detroit). User last reported 2% quota remaining. This document replaces the earlier chronological notes; do not restart discovery or recreate the repository.

## Current stopping point — read first

- The owner decided external cloud storage and a hosted backend are not required at this stage if the current computer-hosted sync meets their needs. Cloudflare/D1 remains an isolated feasibility experiment; do not resume cloud provisioning or identity-provider selection as the default next task.
- The owner subsequently requested that users choose their storage provider and be able to switch later. This is an application requirement, not selection of a particular provider. Keep the free-services-only constraint.
- Storage groundwork, isolated Calendar/computer-sync integration and durable local/computer selection were committed and pushed to `sync-prototype` as `bd6b737`. Physical-device documentation was pushed as ba1cc79. In-page session recovery is included in the subsequent implementation update on sync-prototype; main is unchanged. No public application deployment was changed.
- Ordinary Calendar remains local-only. The isolated staging Calendar now enables Settings → This device (pause sync) and Your computer (resume sync), with a per-account durable selection. OneDrive, Google Drive and Dropbox remain unavailable. The integrated Calendar now has automated coverage plus owner-reported computer/iPad Chrome results; older Xiaomi results apply to the standalone editor.
- `src/storage.ts` defines the common local NoteStore interface and provider availability registry; `src/StorageSettings.tsx` renders the panel. `src/useNotes.ts` and `src/NoteHistory.tsx` use that interface. `src/App.tsx` and `src/App.css` include the new panel and styling. Existing IndexedDB data and its database name are preserved.
- `docs/STORAGE_OPTIONS.md` records the remaining requirements: connect providers, show their roles, preview destination data, copy and verify before activation, preserve notes/history/tombstones/pending edits, recover from interrupted transfers, isolate accounts, coordinate tabs, and retain the old provider's data until explicit deletion. Local/computer sync-mode selection is implemented in staging; cloud connectors and provider-to-provider migration are not. Do not describe local/computer selection as finished cloud switching.
- Latest session-recovery validation: lint, TypeScript, all 16 application tests, ordinary/staging builds and the full staging browser suite passed. The seven Python service tests passed at the earlier implementation stage; the service did not change in this step. The existing large-bundle warning remains. The panel subsequently passed Chrome browser checks and mobile screenshot inspection on 2026-11-17 (see the update below).
- The guided computer/iPad Chrome sequence is complete by owner report: bidirectional edits, pause, paused online reload, resume, unsaved-draft preservation/explicit save, deletion/recovery and offline save/reconnect. See `docs/COMPUTER_SYNC_ACCEPTANCE.md` for precise limits. Integrated Xiaomi testing and production session recovery, offline installation, multi-tab consistency and cloud migration remain unfinished. Owner chose to continue developing synchronization rather than merge into main. Session recovery is implemented and tested; next review it on physical devices, then continue offline app-shell or multi-tab work. Do not repeat completed basic sync checks by default. Keep the public Calendar and original Health Calendar unchanged unless further authorized.

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
