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
