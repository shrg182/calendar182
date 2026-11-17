# Calendar tabs in one browser

Implemented on sync-prototype. Automated shared-profile coverage passed; physical iPad multi-tab acceptance is pending. iPad certificate installation/offline testing remains deferred.

## User behavior

- Tabs on the same origin and account share saved notes, deletions, retained history and pending edits. A saved change refreshes other tabs without requiring reload or Sync now.
- Unsaved drafts stay private to the tab where they are being edited. Peer changes update saved data/history but do not replace the draft. A notice explains that saved notes changed elsewhere. Only explicit Save makes that draft a new operation.
- Open history views refresh while keeping the selected version when it is still available.
- This device / Your computer is shared by all tabs for that account and origin in this browser. Local-only mode stops new note synchronization requests. A request already sent may finish; a saved edit made after pausing remains queued. Another device/browser profile has its own local selection.
- A newly opened tab reads the current saved data and stored selection. Reconnecting one expired same-account session allows peer tabs to verify the shared cookie and recover without reloading or losing drafts.
- HTTP and HTTPS origins still have separate browser data. Independent browser profiles represent different devices; ordinary same-profile tabs do not.

## Coordination and ordering

`src/storageSignals.ts` sends database-scoped metadata notifications after successful IndexedDB commits. Signals contain a kind and notification ID, never note text or tokens. BroadcastChannel and storage events are deduplicated. If BroadcastChannel is unavailable, storage events plus foreground refresh/visible five-second polling provide a fallback. No notification timestamp selects the winning note.

Web Locks serialize sync and mode writes per database where supported. Plain HTTP origins can lack Web Locks: the fallback allows competing requests and relies on immutable operation IDs, exact acknowledgements, authoritative server revisions and transactional cursor commits. Every upload/download page checks the stored mode first. An older page arriving after another tab advanced the cursor is ignored instead of rolling back or resurrecting a deleted record. Retrying an accepted operation never makes it current again.

No tab is a permanent leader. If a source tab closes after a server commit but before acknowledgement, another tab retains the durable outbox entry and retries the same ID. Account/service verification remains mandatory. A shared browser has one active server cookie account per origin; tabs for a different account retain their own database but cannot silently upload under that cookie. This is not general account-switching/migration UX.

Notifications are hints to reread IndexedDB, not an authoritative copy of its data. Browser storage/notification capability failures can delay refresh; foregrounding rereads saved state, and durable transactions remain the source of truth. General background synchronization or guaranteed immediate refresh in suspended tabs is not claimed.

## Verification

Build the staging UI, then run:

```sh
npm run build:computer
PLAYWRIGHT_PATH=/path/to/playwright node prototype/sync/multiple-tabs.cjs
```

The test uses real same-profile tabs and an independent peer browser, all on temporary service data. It runs once with BroadcastChannel/Web Locks, then once with those APIs deliberately absent to exercise storage-event/no-lock behavior. It checks saved-note/history refresh, private drafts, deletion, concurrent saves/sync with unique accepted operations, remote downloads reaching other local tabs, shared pause/resume/new-tab state, source closure after commit before acknowledgement followed by a later competing remote edit, peer session recovery, and account/database isolation.

All 17 application tests (including stale-page/tombstone/cursor protection), lint/typecheck and ordinary/staging builds passed. The independent-device synchronization/session suite, offline/update suite and ordinary navigation/notes/import/history browser suites passed. Service code was unchanged from the preceding offline/HTTPS checkpoint; its ten tests were not rerun for these client-only changes. The ordinary build now includes local tab refresh but no worker registration or automatic cloud sync; main/public deployment remain unchanged.
