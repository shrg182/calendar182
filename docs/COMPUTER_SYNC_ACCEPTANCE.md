# Calendar staging: physical-device acceptance

Prepared 2026-11-17 (America/Detroit). Status: guided computer/iPad Chrome sequence and in-page session-recovery check passed by owner report; limits and untested scenarios are listed below.

Devices exercised in this integrated Calendar sequence: computer and iPad using Chrome. Exact iPad model, operating system and browser versions were not recorded. Xiaomi 13/Chrome was planned but not exercised in this sequence; its earlier results cover the separate standalone sync editor. Use one tab per browser profile on the same trusted home network and synthetic notes only.

## Connection

- URL on both devices: `http://192.168.68.58:8791/calendar/`.
- Account: `account-a`; privately copy its generated token from `prototype/sync/.data/calendar-stage/test-credentials.json`. Do not post tokens in test results.
- Keep the computer awake and the staging service running. Local HTTP/test authentication is for this home-network experiment.
- The LAN address has separate browser storage from `127.0.0.1`, port 8790 and the public Calendar. Existing notes are not automatically moved to it.
- The computer's LAN address may change; the URL and service allowlist must then be updated.

## Checks and results

Record owner observations individually; automated Chrome contexts are separate evidence.

| Check | Expected result | Physical result |
| --- | --- | --- |
| Open/login on both devices | Full Calendar opens and account-a connects | Passed by owner report on computer/iPad Chrome |
| Bidirectional saved edits | Computer saves reach iPad and iPad saves reach computer | Passed by owner report |
| Pause iPad synchronization | Settings → This device stops note synchronization | Passed behaviorally; disabled Sync now control not explicitly reconfirmed |
| Save while paused | iPad saved edit does not reach computer | Passed by owner report after a 20-second wait; incoming computer edits while paused were not tested |
| Reload while paused, online | Local selection and iPad saved note remain; computer stays unchanged | Passed by owner report |
| Resume iPad synchronization | Settings → Your computer uploads the pending saved edit | Passed by owner report; computer updated quickly |
| Unsaved draft during selection | Draft survives local/computer selection without uploading; explicit Save uploads it | Passed by owner report |
| Delete and recover | Deletion propagates; Note history → Use this version → Save note restores and synchronizes | Passed by owner report |
| Offline save/reconnect | iPad saves while disconnected, computer stays unchanged, then receives edit after reconnection | Passed by owner report |
| In-page sign-in recovery | Draft survives expired sign-in and reconnection without reload; only explicit Save uploads it | Passed by owner report on implementation 224d8fc |

Automatic mode syncs after saves/reconnection/focus and polls roughly every 15 seconds while visible. Allow up to 20 seconds for a receiving foreground device, or use Sync now when enabled. Selecting This device pauses both manual and automatic note synchronization. An offline page reload is not part of this checklist: the app shell is not yet available offline.

## Preparation evidence

The staging service was restarted with its existing data directory and explicit LAN binding/host allowance. Both LAN and loopback Calendar URLs returned HTTP 200. The older port-8790 experiment was not restarted or modified. At preparation time no physical result had been observed; the iPad results below were subsequently reported. The previously passing automated staging browser tests include local/computer selection, pending edits, reload, drafts, conflict/retry handling and account isolation.

## iPad reachability observation — 2026-11-17

Owner confirmed the current Calendar URL `http://192.168.68.58:8791/calendar/` works in iPad Chrome. The old port-8790 experiment was not listening; the current port-8791 Calendar returned HTTP 200 over loopback and LAN from the computer. This establishes owner-reported iPad page reachability only. Login, note synchronization and storage-mode checks on the iPad remain pending. Do not apply this observation to the Xiaomi or mark the combined open/login checklist item passed.

## Computer-to-iPad saved note — 2026-11-17

Following the instruction to sign in as account-a on both devices, save "Computer test 1" on the computer for 2026-11-17 and check that date on the iPad, the owner reported "It works as expected." Record as owner-reported successful computer-to-iPad saved-note synchronization in iPad Chrome. Reverse-direction iPad edits and local/computer selection checks remain pending. No Xiaomi result is established by this report.

## iPad-to-computer saved note — 2026-11-17

Following the instruction to change the same 2026-11-17 note to "iPad test 2" on iPad, save and check the computer, the owner reported "It works as expected." Bidirectional saved-note synchronization is now owner-reported successful between the computer and iPad Chrome for the integrated Calendar on port 8791. Local/computer mode selection and the remaining scenarios are not yet physically verified. Xiaomi results remain separate.

## iPad paused synchronization — 2026-11-17

After instructions to choose Settings → This device on iPad and save "iPad paused test 3" for 2026-11-17, the owner reported waiting 20 seconds and that the computer stayed unchanged. Record as owner-reported non-propagation to the computer while paused. The report did not explicitly reconfirm the exact saved iPad text or disabled Sync now control. Next verify an online iPad reload retains the local selection and saved text before testing resume.

## iPad reload while paused — 2026-11-17

Owner reported that after reloading the iPad page, Settings remained on This device, the November 17 note was retained unchanged, and the computer remained unchanged. Record as owner-reported persistence of local-only selection and saved note across an online reload, with no propagation to the computer. Exact note text was not restated. Resuming computer synchronization is the next pending check.

## iPad synchronization resumed — 2026-11-17

After selecting Settings → Your computer on iPad, the owner reported that the computer quickly showed the updated iPad text. Record as owner-reported successful upload of the saved paused edit on resume. The integrated Calendar now has owner-reported computer↔iPad Chrome sync, paused non-propagation, paused selection/note persistence after online reload and successful resumption. Draft preservation during selection, delete/recovery and offline save/reconnect remain pending on these physical devices.

## iPad unsaved draft during selection — 2026-11-17

Asked whether the unsaved "Unsaved draft test" text remained on iPad after selecting This device then Your computer, while the computer retained the previously saved text, the owner answered yes and reported neither device changed after switching settings. Record as owner-reported draft preservation and no implicit draft upload during mode selection. Explicitly saving that draft and confirming convergence is the next check.

## Explicit draft save synchronized — 2026-11-17

After the instruction to explicitly Save note on iPad with Your computer selected, the owner confirmed that "Unsaved draft test" appeared instantly on the computer. Record as owner-reported successful explicit draft save and convergence after storage-mode navigation. Deletion/recovery and offline save/reconnect remain physically unverified for this integrated Calendar build.

## iPad deletion propagation — 2026-11-17

Owner first erased the editor text and observed Save note disabled. Clarified that empty text cannot be saved and deletion requires Delete note plus confirmation. After that instruction, the owner reported "The computer changes quickly." Record as owner-reported deletion propagation in response to the deletion check; recovery remains pending.

## iPad history recovery — 2026-11-17

After instructions to select the "Unsaved draft test" version in November 17 Note history, use it as a draft and explicitly Save note, the owner reported "It works as expected." Record as owner-reported history recovery and propagation of the restored text to the computer. Offline save/reconnect is the remaining integrated Calendar check in this sequence.

## iPad offline save/reconnect — 2026-11-17

Following instructions to keep Calendar open with Your computer selected, disconnect iPad networking, save "Offline iPad test", verify the computer stayed unchanged and reconnect Wi-Fi, the owner reported "It works as expected." Record as owner-reported successful local offline save and synchronization after reconnection. The exact upload interval was not measured. No offline reload was requested or tested.

## Completed sequence and limits

All checks in the guided computer/iPad sequence above passed by owner report. These are human observations, separate from automated Chrome tests. Incoming computer edits while iPad is paused, explicit disabled-control confirmation, competing offline edits, lost acknowledgements, account isolation, integrated-Calendar service restart, offline app-shell reload, other iPad browsers and Xiaomi acceptance were not physically exercised in this sequence. Some protocol scenarios have independent automated coverage; that does not replace these physical checks. Production authentication, cloud migration and general multi-tab consistency remain unfinished.

## In-progress physical session-recovery check — 2026-11-17

Implementation: 224d8fc. Owner prepared an unsaved "Reconnect draft test" on iPad with computer mode and automatic sync enabled, then replied Ready. Expired five active account-a sessions in the isolated staging service; accepted note operation count was unchanged. Owner confirmed the Reconnect same account form appeared and, on inspection without reload, the note text was unchanged. This establishes owner-reported form appearance and unsaved-draft retention after actual test-session expiry. Reauthentication and subsequent recovery are not yet confirmed. Both devices' account-a sessions were expired deliberately; computer may also require reconnection.

## iPad reauthentication retained draft — 2026-11-17

Owner confirmed the reconnect form disappeared after entering the account-a token and tapping Reconnect same account, while note contents remained unchanged. Record as successful owner-reported same-account reauthentication without reload and preservation of the unsaved draft. Implicit draft non-upload and explicit post-reconnect Save convergence still require observation; the computer also needs to reconnect because its account-a session was deliberately expired.

## Physical session-recovery sequence complete — 2026-11-17

After reconnecting the computer, the owner confirmed it still showed the previously saved text, excluding the unsaved iPad draft. Then, instructed to explicitly Save note on iPad and check for "Reconnect draft test" on the computer, the owner reported "It works as expected."

The guided recovery sequence on implementation 224d8fc passed by owner report: actual staging sign-in expiry, reconnect form appearance, unsaved draft retained before/after same-account reauthentication without reload, computer reauthentication with no implicit draft upload, and explicit post-reconnect Save convergence. Wrong-token handling and reconnecting in local-only mode have automated coverage but were not physically tested in this sequence. Exact OS/browser versions and timings remain unrecorded. Earlier in-progress statements above describe intermediate checkpoints.

## Offline reopening/HTTPS follow-up — prepared, not physically accepted

Offline shell/update code is now tested on secure loopback. The earlier HTTP LAN iPad sequence does not establish offline reload support. Local HTTPS endpoint on port 8792 and a public Calendar182 certificate-only profile are prepared; device trust has not been changed. Await explicit user preference before guiding iPad root-certificate trust. See OFFLINE_LOADING.md for exact URLs, fingerprint, setup/removal instructions and remaining checks. HTTPS browser storage is separate from the old HTTP origin.
