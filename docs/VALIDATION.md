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
