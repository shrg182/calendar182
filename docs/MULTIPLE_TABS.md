# Calendar tabs in one browser

Implemented on sync-prototype. Automated shared-profile coverage passed. The owner reported automatic saved-text refresh across four tabs during the guided computer/Chrome check; subsequent guided checks also confirmed draft protection and shared local/computer selection, as recorded below. The device/browser identity was not restated in the reply, and iPad multi-tab acceptance is not established. iPad certificate installation/offline testing remains deferred.

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

## Manual four-tab observation — 2026-11-17

On implementation b5a7dee, following instructions to use same-profile computer Chrome tabs at the HTTP Calendar URL, the owner reported that four tabs showed "Shared tab test 1" without reloading or Sync now. Record as owner-reported successful saved-note fan-out across four tabs. Exact device/browser version was not recorded or restated in the report. Unsaved-draft protection, shared mode selection and the remaining manual scenarios are not yet established by this observation. Next: leave an unsaved draft in one tab, save different text in another and verify separation.

## Manual draft protection — 2026-11-17

After instructions to type "Private draft in Tab 2" without saving there, then save "Shared tab test 2" in Tab 1, the owner confirmed expected behavior: Tab 2 retained its private draft while the other three tabs displayed the new saved text. Record as owner-reported draft protection and saved-note refresh across the four-tab session. Explicitly saving that draft and verifying four-tab convergence is the next pending check.

## Manual explicit draft save — 2026-11-17

After explicitly saving the prepared draft in Tab 2, the owner confirmed all four tabs showed "Private draft in Tab 2" as expected. Record as owner-reported four-tab convergence after explicit Save; the earlier unsaved draft had remained private. Shared local/computer selection is the next pending manual check.

## Manual shared local-only selection — 2026-11-17

After selecting Settings → This device in Tab 1, the owner confirmed that all four tabs reflected This device and had Sync now disabled. Record as owner-reported shared local-only preference and disabled manual sync controls. Resuming from another tab and syncing an edit saved while paused remain pending.

## Manual local sharing while paused — 2026-11-17

Following instructions to save "Four tabs paused test" in Tab 1 with local-only selected, while the independent iPad remained open with computer sync enabled, the owner confirmed expected behavior: all four local tabs showed the saved edit and the iPad stayed unchanged. Record as owner-reported local shared data with paused outbound propagation. Resuming from a different tab and independent-device convergence is the next pending check.

## Manual resume delivery investigation — 2026-11-17

Asked to resume Your computer from Tab 2 and check the iPad, owner reported the iPad did not show "Four tabs paused test." The first read-only server check found no accepted operation containing that marker and November 17 at revision 18. A subsequent read-only check found it accepted, and the current November 17 record contained the marker at revision 20 (not deleted). Upload therefore arrived during investigation; no code/data mutation was made. Exact intervening user actions and elapsed time were not established. iPad receipt is still unconfirmed. Requested foregrounding iPad for up to 20 seconds, then Sync now and its exact status if still missing, without reloading/clearing possible drafts. Also asked whether all four source tabs show Your computer and for Tab 2's status. Do not mark resume/independent-device convergence passed until observed.

## Manual final convergence after Save — 2026-11-17

Owner reported: "After saved the text in Tab 2, all four tabs and iPad show the same text." The asynchronous answer "yes" also confirmed the all-four Your computer selection; no exact sync-status text was supplied. Record as owner-reported successful post-resume explicit Save and convergence across the four local tabs and independent iPad.

The preceding resume-only delay was not isolated: an extra Save occurred before final convergence, and the marker reached the server during investigation. Do not claim that automatic upload of the original already-saved paused operation on resume was independently confirmed by this manual check, or that a code fix was made. Automated tests separately cover pending upload on resume. Manual results establish saved-text sharing, private-draft protection and explicit-save sharing, shared pause selection/disabled controls, local-only sharing without iPad propagation, shared resume selection and post-resume saved-edit convergence.
