# Development preview validation — 2026-11-16

Passed locally: npm install (zero reported vulnerabilities), lint, TypeScript check, three civil-date tests and production build. Chrome smoke test passed against `/calendar182/`: next month, Today, date details, Settings return, no overflow at 390px and 1280px, and no page errors. Mobile screenshot inspected at `/tmp/calendar182-mobile.png`.

Not verified: real iPhone, WebKit, independent lunar correctness, GitHub-hosted deployment until workflow completes. No notes, Shensha matching, accounts, sync, offline installation or full localization are implemented.

For browser verification run `npm run build`, `npm run preview -- --host 127.0.0.1`, then `PLAYWRIGHT_PATH=/path/to/playwright node tests/browser.cjs` in another terminal. The script uses installed Chrome and does not install browser dependencies automatically.

## Traditional labels update

Removed the large introductory heading. Cells show lunar month names on day one and traditional day names otherwise; common holiday names precede solar terms, with both shown on collisions. Full lunar labels remain in day details. Gregorian dates/Today stay device-local. Library conversion accepts civil components without converting the selected device instant into another date.

Added lunar-javascript 1.7.8 (MIT; notice shipped in public/lunar-javascript-LICENSE.txt). Holiday names are a curated fixed-date/lunar-date set, excluding leap-month repetitions; they are not an official statutory holiday schedule. No date calculations for existing GanZhi/Shensha have been changed.

Passed: lint, typecheck, 6 tests, production build, Chrome phone/desktop smoke and visual inspection. Six tests also pass under Pacific/Honolulu and Pacific/Kiritimati. Source-derived fixture tests compare every 2026 lunar date and all 24 solar-term civil dates, plus leap-month labels, New Year’s Eve, Spring Festival, Christmas, holiday collisions and ordinary days. Full 1901–2100 correctness and real-device Safari remain unverified. Production JS is about 172 KB gzip following addition of the calendar library; Vite warns that the single minified chunk exceeds 500 KB.

Fixture sources (retrieved 2026-11-16):
- Hong Kong Observatory: https://data.weather.gov.hk/weatherAPI/hko_data/calendar/nongli_calendar_2026.csv
- Hong Kong Observatory: https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2026e.txt
- Dataset: https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table
- HKO notes future near-midnight uncertainty: https://www.hko.gov.hk/en/gts/time/conversion.htm
- Library: https://github.com/6tail/lunar-javascript

The HKO fixture contains factual dates and labels; source prose is not reproduced. The reference calculation-conventions document describes the old app, not the new label engine.

## Local daily notes

Implemented isolated IndexedDB `calendar182.notes.v1`: notes keyed by Gregorian civil date; per-save UUID; history; ordered auto-increment outbox with unique operation IDs. Note update, superseded version and outbox entry share one transaction. Delete writes a tombstone and retains prior text in history. Explicit Save/Delete; 20,000-character limit; saved-note markers; drafts survive in-page date/settings navigation. A beforeunload handler warns on unsaved drafts or active operations; browser delivery of that warning is not a persistence guarantee.

JSON export reads all stores in one transaction and includes notes, deleted records, previous versions and operations. Export does not include unsaved drafts. No restore/import UI, account isolation or sync provider is implemented. Notes remain local to this origin/browser profile; concurrent tabs do not refresh each other’s in-memory snapshots yet. History and operations currently have no automatic pruning. These are development limitations, not release acceptance.

Passed: lint, typecheck, 8 unit/storage tests and build. Chrome notes smoke passed: drafts through Settings, save/reload, markers, injected transaction failure preserving draft, successful retry, downloaded backup including prior version and operations, delete/reload, phone overflow. Tests use isolated browser contexts and synthetic notes, not user data. IndexedDB tests use fake-indexeddb. The schema was not changed after publication of any note-enabled build.

## Backup import update

Added Settings file upload (25 MB limit), strict format/version/date/text/timestamp validation, duplicate date and conflicting operation-ID checks, conflict/deletion preview, keep-existing default, explicit replace choice and cancel. All in-page drafts must be saved before import. Accepts existing Daymark version 1 note backups and Calendar182 version 1 full backups.

One transaction retains incoming saved versions and local superseded notes, writes imported current notes/deletions and creates fresh ordered local operations. Source outbox entries are retained as historical versions, not replayed as remote writes. Keep-existing also keeps local tombstones. Import only merges dates represented by the file; it never clears unrelated local notes. Retained versions are currently accessible through exported JSON, not a history browsing UI.

Passed: 12 unit/storage tests including malformed backups, keep/replace, full backup deletion restoration, legacy compatibility, history retention and atomic rollback on operation-ID collision. Chrome upload smoke passed: draft guard, preview/conflict count, keep default, replacement, reload persistence, rejection of duplicate dates and mobile layout. Lint/typecheck/build also pass. Older paragraphs above describe previous development stages.

## Note history recovery

Added collapsible Note history under the daily editor. Versions are loaded on demand, filtered by civil date, and displayed as plain text with saved timestamps. Use this version copies text into the draft, never directly into saved storage. A different unsaved draft requires confirmation before replacement. Explicit Save retains the previously current version and creates a fresh local operation. Deleted notes can be recovered from their nondeleted saved versions. Imported retained history is included.

Passed: lint/typecheck/build, existing 12 unit/storage tests, and Chrome recovery test covering preview, unsaved restoration discarded on reload, draft replacement cancellation/acceptance, explicit Save, deleted-note recovery, reload persistence and phone overflow. No automatic sync or cloud provider was added. History is local and remains subject to browser storage clearing; export independent backups.

## Find date

Added an accessible native date input and Show date action below the calendar, constrained to 1901–2100. Submission uses civil components to select the day and open its month. In-page drafts remain stored during navigation. Lint/typecheck/build and Chrome checks passed for leap day, both range edges, disabled forward navigation at December 2100, and no overflow at 320/390/1280px.

## Saved-note search

Added Settings → Search saved notes. Search is case-insensitive over local saved text, excludes deleted notes and unsaved drafts, displays up to 20 newest-date results with a total count, and opens the selected date. Snippets render as plain text. Passed lint/build+typecheck and Chrome notes regression including search/open followed by backup and delete checks.

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

## Workers/D1 local feasibility — 2026-11-16

Nine local Miniflare runtime tests passed for the isolated API adapter: lost-ack retry identity, concurrent writes/retries/conflicts, 205-record pagination/account isolation, deletion/recovery, validation, transactional rollback, injected storage failure, local-only identity/origin gates, and persistent runtime restart. See [test scope and limitations](../prototype/cloudflare/README.md). This is local API compatibility evidence, not a hosted or physical-device D1 test. No production authentication or Calendar sync integration was added.

## Calendar computer-sync staging — 2026-11-17

All 15 application tests, lint, TypeScript and ordinary/staging production builds passed; both builds retain the known large-chunk warning. Seven Python service tests passed, including new static asset allowlist and account-bound upload checks. The ordinary Calendar browser suites passed navigation/responsiveness, save/reload/failure/retry/export, import, and history recovery against dev port 5173 using isolated Chrome contexts.

`prototype/sync/calendar-clients.cjs` passed against a temporary real service and generated staging assets: two independent Calendar clients, bidirectional edits, offline late acceptance, dirty-draft protection, deletion/recovery, committed upload with dropped acknowledgement followed by a later competing edit, pending queue across reload, automatic sync, separate-account isolation, cookie-account mismatch refusal and no production/prototype notes database opened. Settings had no horizontal overflow at 320/390/1280px. No real user data was used.

These checks cover the full Calendar staging build, while earlier physical Xiaomi/computer tests covered the standalone editor. At that automated-test stage physical-device acceptance was outstanding; subsequent owner-reported iPad results are recorded below. Browser/PWA lifecycle, production authentication, safe provider migration and general multi-tab consistency remain unfinished. No hosted service or cloud integration was deployed.

### Durable local/computer selection

After adding per-account selection metadata and shared React controls, lint, typecheck, all 15 application tests and both builds passed. The full staging browser suite passed again with extra checks: unsaved draft preservation while selecting local mode, disabled Sync now, saved notes and pause surviving reload, no note upload/change requests during paused save/reload/offline/reconnect, unchanged peer data while paused, successful pending upload on resume, and enabled selection surviving reload. Tests use independent Chrome contexts and temporary service data. These automated results are distinct from the subsequent owner-reported physical results below.

### Owner-reported computer/iPad Chrome sequence — 2026-11-17

The owner confirmed the integrated Calendar at `http://192.168.68.58:8791/calendar/` works between the computer and iPad Chrome: bidirectional saved edits, pausing iPad sync with no outbound propagation, local selection/saved note retained after online reload, successful resume, unsaved drafts surviving mode selection without implicit upload, explicit draft-save propagation, deletion and history recovery, and offline save/reconnect. This is manual owner-reported evidence; exact OS/browser versions and timings were not measured.

See `COMPUTER_SYNC_ACCEPTANCE.md` for scope and exclusions. Xiaomi testing of this build, incoming writes while paused, concurrent physical-device edits, integrated-service restart, offline app-shell reload and production authentication are not established by this sequence. Implementation remains commit bd6b737; these results are documentation changes.

### In-page session recovery — 2026-11-17

Lint, typecheck, all 16 application tests and ordinary/staging builds passed. The full staging browser suite passed with added authentication-loss checks (one context's cookies removed): saved pending operation and unsaved draft retained, no focus/online retry after 401, wrong-account token rejected/cleared, correct same-account reconnect without reload, saved-operation convergence without implicit draft upload, subsequent explicit draft save, and local-only selection retained during reauthentication until explicitly resumed. Unit tests reject changed account/service epoch on reconnect. Desktop form/error screenshot was inspected.

These are automated Chrome results; prior owner-reported iPad acceptance did not test the new reconnect form. No production identity provider or full-page/offline reload recovery is established. The ordinary build bundle remained unchanged; main was not merged or deployed.

### Owner-reported iPad sign-in recovery — 2026-11-17

On implementation 224d8fc the owner prepared an unsaved iPad draft, then five account-a staging sessions were explicitly expired with no accepted-note-operation change. Owner confirmed the reconnect form appeared, the draft survived, same-account reconnection dismissed the form without changing the draft, the reconnected computer still showed prior saved text, and explicit Save note on iPad propagated "Reconnect draft test" as expected. This covers real staging session expiry and no-reload draft-preserving recovery by human observation. Wrong-token/local-only recovery remains automated evidence only; no production authentication or offline app-shell behavior is established.

### Offline app-shell/local HTTPS — 2026-11-17

All 17 application tests passed, including remembered account/service metadata without token persistence and corrupt identity rejection; lint/typecheck and ordinary/staging builds passed. The ordinary JS asset remained unchanged and no ordinary worker was emitted. The known large-chunk warning remains.

New offline browser suite passed with real workers on secure loopback: reload offline into saved notes, save/reload offline, reconnect convergence, API cache exclusion, expired-auth local opening/reconnect, failed new-worker install rollback, two-tab waiting update preserving an unsaved draft, saved notes surviving activation and the new shell reopening offline. Full existing Calendar sync/session-recovery browser suite passed with the new banner. All browser test data was temporary.

All 10 Python HTTP/HTTPS service tests passed, including normal CA/hostname verification, refusal without trusted CA, HTTPS origin enforcement, separate Secure/HttpOnly session cookie, and public certificate/profile content limited to the prepared certificate. Retained HTTPS Calendar returned 200 with an explicit trusted CA; downloaded public profile matched local DER with one certificate payload. No trust-store installation or insecure browser flags were used. iPad trust/HTTPS/offline reopening and home-screen installation remain unverified. See OFFLINE_LOADING.md.

### Multiple-tab consistency — 2026-11-17

All 17 application tests, lint/typecheck and ordinary/staging builds passed. A unit assertion verifies an older downloaded page cannot roll back the cursor or resurrect a newer tombstone.

`prototype/sync/multiple-tabs.cjs` passed with real shared-profile tabs and an independent peer, both with BroadcastChannel/Web Locks and with those APIs absent: saved/history refresh, draft preservation, deletion, concurrent writes with one accepted record per operation ID, remote changes through one local tab, shared pause/resume including a new tab, closing the uploader after server commit before acknowledgement then retrying after a later competing write, same-account peer reauthentication and cross-account isolation. All service data and credentials were temporary.

The full independent-device sync/session-recovery and offline/update browser suites also passed. Original navigation, note save/reload/failure/retry/backup, import and history browser suites passed against dev port 5173 using isolated contexts. No physical multiple-tab iPad result is claimed. Python service code was unchanged in this step; its preceding ten-test result remains separate evidence.

### Owner-reported four-tab check — 2026-11-17

On b5a7dee the owner reported four tabs refreshing saved text without reload/Sync now, preserving one tab's unsaved draft while peers updated, explicit-save convergence, shared local-only mode with disabled Sync now, and local saved sharing while the independent iPad stayed unchanged. All four later selected Your computer. Initially the iPad lacked the paused-test marker; read-only server checks progressed from no marker/revision 18 to the marker current at revision 20. After an additional explicit Save in Tab 2, all four tabs and iPad converged by owner report. This does not independently establish resume-only automatic pending upload or explain the earlier delay. No code/data fix was made. Exact browser/device versions and sync-status text were not captured; automatic resume has separate automated coverage.

### Owner-reported controlled resume-only result — 2026-11-18

A fresh controlled setup required "Resume-only check 1" saved with This device selected and local Save confirmation. The owner corrected an initial misreading: iPad had not changed while paused, consistent with read-only server checks finding no marker. Then instructed to select Your computer in Tab 2 and observe without another Save/reload/Sync now, owner confirmed the iPad showed the same test text. This independently establishes owner-reported resume-only delivery for the new scenario. It does not explain the earlier uncontrolled delay; no implementation fix or test rerun was needed.

### Database backup/recovery — 2026-11-19

Six backup tests passed for live WAL/concurrent snapshots, consistency/private permissions, source-session preservation and backup-session clearing, new-directory-only restore/epoch rotation, tombstones/retry identity, retention/failure handling, invalid snapshot refusal and scheduler/lock coordination. All 16 Python tests passed together; scheduler tests were rerun after tightening wake/check cadence. Shared-tab browser regressions passed against command-line services creating their startup snapshots. Frontend code did not change and its tests/builds were not rerun; lint/whitespace checks passed.

A non-destructive drill on the retained staging data verified 25 accepted operations and one current record. New restore directory had a different epoch and no sessions; the live database's epoch/operation/session counts were unchanged. After enabling automatic scheduling on both retained services, HTTP and CA-verified HTTPS returned 200 and the live epoch still matched the snapshot. Generated snapshots and drill evidence remain private/ignored. This is same-disk recovery, not an off-device backup or automated production cutover.

### Selected-destination backup copies — 2026-11-19

All 21 Python tests passed. Five new tests verify byte-checksummed/idempotent bundles and restore, missing root/live-source refusal, corrupt-copy overwrite/restore refusal, failed-copy cleanup with source/previous copy preservation, and scheduler retry when the destination returns without breaking local snapshots. Lint/whitespace checks passed. All copy destinations and notes were synthetic/temp data. No actual external drive or cloud folder was chosen, configured or written, and no off-computer recoverability is claimed.

### Selected iCloud Drive copy — 2026-11-19

Exported fresh retained-data snapshot `calendar182-20261119T161642588269Z-e25adc78` to the explicitly selected/permission-approved iCloud Drive Calendar182Backups folder. Checksum and SQLite checks passed. Restoring from the copied bundle into a fresh ignored drill directory verified 25 accepted operations/one current record, epoch rotation and empty sessions; live identity/operation/session counts were unchanged. Targeted macOS Foundation metadata reported both files ubiquitous/uploaded, not uploading, with no upload errors/conflicts. This is OS-reported upload plus local restoration; independent-device cloud download/checksum/restore remains unverified. Both retained services restarted with --backup-copy-root and returned 200. Only configuration/documentation changed; no code tests rerun or device trust changes.

### iPad iCloud manifest access — 2026-11-19

Owner confirmed the folder in iPad Files and supplied the selected manifest: operations 25/records 1, expected format and SHA-256 5469c09d5fe92314c8932b55db26a55bf2c6ef2c1a8f7bf7f24fe91e779c6541. Re-verifying the Mac iCloud-folder bundle/database produced that same checksum and counts. Record independent-device manifest access; the database itself was not independently downloaded/hashed/restored on iPad. No code changes or code test reruns.

### Mac startup and backup health — 2026-11-19

Lint, typecheck, all 18 application tests, both builds and all 27 Python tests passed. New parser/service/startup-plan tests cover sanitized authenticated health, persisted destination-scoped verification and startup configuration safety. The status browser suite passed healthy timestamps, destination failure/recovery, last-known status on fetch failure, draft preservation and 320/1280px layout. Shared-tab suites passed with normal and fallback browser APIs.

Installed both prepared per-user LaunchAgents. Authenticated HTTP/HTTPS reports showed managed startup, running hourly backups, local snapshot and verified destination timestamps, and no failures. A fresh snapshot matched live database identity and note/history counts. Controlled termination of each job produced a new PID automatically. This verifies process recovery, not a real reboot/sign-in. Owner panel acceptance remains pending. No trust/power settings or public deployment changed.
