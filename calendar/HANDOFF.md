# Calendar182 handoff

Updated: 2026-11-16 (America/Detroit). User last reported 2% quota remaining. This document replaces the earlier chronological notes; do not restart discovery or recreate the repository.

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
