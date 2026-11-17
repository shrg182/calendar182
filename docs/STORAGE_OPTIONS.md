# User-selectable storage

Status: initial interface and Settings availability panel; cloud connections and migration are not implemented. External provider selection is deferred. Free services only; never automatically enable paid services.

Local IndexedDB remains the working store on every device. `src/storage.ts` exposes a common NoteStore interface used by note loading, saves, backup, import and history. The existing database name, records, history and durable outbox are preserved.

Settings lists This device (active), Your computer (separate prototype), OneDrive, Google Drive and Dropbox (unavailable). Only implemented options are enabled. This list is a product roadmap, not a claim of provider support. No account connection, remote request or migration occurs. Cloud storage and a hosted sync database are separate roles; choosing a drive must not silently enable another backend.

## Required switching behavior

The user must be able to connect, select, switch and disconnect supported providers without losing local notes. Do not ship an activation control before these requirements are implemented:

1. Connect and verify the destination account with minimum required permissions. Show whether it stores backups, attachments or live synchronized notes. Show any separate sync backend.
2. Block transfer while unsaved drafts or writes are outstanding; preserve pending operations. Coordinate all open tabs. Export a recoverable snapshot including current/deleted notes, history and pending operations.
3. Preview source/destination accounts and existing destination data. Require an explicit merge decision; never silently overwrite an existing archive.
4. Copy with resumable, idempotent operations. Verify complete contents, tombstones and retained versions before activation. Writes during transfer require a lock or a tested catch-up protocol.
5. Commit activation only after verification. On error, cancellation, quota exhaustion or authentication failure, retain the source and pending operations. A reload must resume or roll back safely.
6. Keep the previous provider's data until an explicit deletion request. Disconnecting authorization and deleting remote data are distinct actions. Account switching must never send one account's queued notes to another.

Each provider needs separate authentication, API and real-device acceptance tests. Direct personal-drive synchronization must demonstrate competing-write ordering and retry safety before being offered as equivalent to the tested computer service. Do not synchronize a single shared SQLite file through a drive client.

## Next implementation

Integrate the existing computer service into a separate Calendar staging build first, or implement one cloud connector after the user selects a provider. The current application cannot yet switch providers. Portable JSON export/import remains available for manually moving saved notes between browsers.

## Isolated Calendar computer-sync integration — 2026-11-17

`npm run build:computer` compiles the Calendar UI with computer synchronization enabled into ignored `prototype/sync/calendar-dist/`. The ordinary build stays local-only. Serve the staging build with the Python reference service using `--calendar-dist prototype/sync/calendar-dist`; its URL is `/calendar/` on that service's origin. The original standalone client remains at `/`.

Staging requires the generated test account/token and uses `calendar182.computer-staging.v1:<account>` in IndexedDB, separate from both the ordinary Calendar database and standalone prototype client. No automatic transfer of real notes takes place. Computer selection in the ordinary app remains unavailable; the staging build is the integration test, not a completed switching UI.

The integration uploads bounded durable operations, checks exact acknowledgements, downloads validated incremental pages and commits each page with its cursor. Pending local dates remain visible while remote versions enter history. Account-scoped request headers prevent cookie/account changes from routing queued notes into another account. A persistent service identity blocks sync against a replacement database; the Calendar remains available for backup export. Downloaded timestamps are local receipt times in this experiment; authoritative order uses server revisions.

Automatic sync runs while the page is open, pauses polling while hidden, retries with backoff and responds to saves/reconnection/focus. Settings and note navigation retain unsaved drafts. Deletion and explicit history recovery use the same operation queue. Web Locks coordinate sync where available; use one tab per profile for this test, especially on HTTP LAN origins without Web Locks. Offline app-shell reload/PWA, production authentication, account switching/disconnect UX, general multi-tab refresh and provider migration remain unfinished. Use synthetic notes only with this HTTP/test-auth service.

Build and test commands and manual staging launch are in `prototype/sync/README.md`.

## Local/computer selection in staging

The isolated Calendar build now enables two choices in Settings: **This device** pauses note synchronization; **Your computer** resumes it and uploads pending saved edits. This changes synchronization mode for the same account's local database; it is not a transfer to a different database or cloud provider. Ordinary Calendar stays local-only, and cloud options remain unavailable.

The selection is stored transactionally in the account-specific IndexedDB metadata and restored before sync starts. Controls wait for an in-flight sync to finish before changing mode. Pausing cancels future polling/save/reconnection triggers; manual Sync now is disabled. Existing notes, retained versions, drafts, pending operations and remote copies remain intact. Reconnection resumes the existing epoch/cursor and immutable operation IDs. Authentication/session checks may still occur when the page opens; paused mode blocks note upload/download traffic, not the login flow.

The choice is separate from the Automatic sync checkbox: disabling automatic polling still permits Sync now, while choosing This device pauses both. Pending edits saved while paused intentionally upload when Your computer is selected again. This is not account logout or remote-data deletion. General multi-tab switching, cloud migration and account recovery remain outstanding; use one tab per profile.

## In-page session reconnection

The staging workspace handles an expired or missing session without unmounting Calendar. A 401 stops retries and shows a same-account token form. Reconnecting preserves drafts, local records, the durable outbox and the selected synchronization mode. It resumes saved edits when computer mode is enabled and remains paused in local-only mode. Wrong credentials and different account/service identities are rejected before any queued note transfer. No logout/account migration or production identity system is introduced.

## Offline reopening

The isolated build can reopen cached app assets and saved account-local notes on a secure origin. Remembered account/service labels permit local access but do not authenticate uploads. Connectivity restoration verifies both labels before queued edits synchronize, and local-only mode stays paused. The app-shell cache excludes API data and credentials. Updates wait for all old Calendar tabs to close; users save drafts before closing. HTTP→HTTPS origin changes do not migrate local browser data. See [offline implementation and local HTTPS setup](OFFLINE_LOADING.md).
