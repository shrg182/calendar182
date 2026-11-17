# Calendar staging: physical-device acceptance

Prepared 2026-11-17 (America/Detroit). Status: awaiting owner observations.

Devices: computer and Xiaomi 13; owner selected Chrome on the phone. The browser version is not recorded. Both devices must be on the same trusted home network. Use one tab per browser profile and synthetic notes only.

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
| Open/login on both devices | Full Calendar opens and account-a connects | Pending |
| Bidirectional saved edits | Save on computer, receive on phone; save on phone, receive on computer | Pending |
| Pause phone synchronization | Phone Settings → This device; Sync now disabled | Pending |
| Save while paused | Phone local edit remains absent from computer; computer edit does not replace phone text | Pending |
| Reload while paused, online | Local choice and phone saved edit remain; no synchronization | Pending |
| Resume phone synchronization | Settings → Your computer; pending phone edit uploads and both devices converge | Pending |
| Unsaved draft during selection | Draft survives Settings navigation and changing local/computer selection without uploading | Pending |
| Delete and recover | Deletion propagates; Note history → Use this version → Save note restores and synchronizes | Pending |
| Offline save/reconnect | Saved phone edit uploads on reconnection when computer mode is enabled | Pending |

Automatic mode syncs after saves/reconnection/focus and polls roughly every 15 seconds while visible. Allow up to 20 seconds for a receiving foreground device, or use Sync now when enabled. Selecting This device pauses both manual and automatic note synchronization. An offline page reload is not part of this checklist: the app shell is not yet available offline.

## Preparation evidence

The staging service was restarted with its existing data directory and explicit LAN binding/host allowance. Both LAN and loopback Calendar URLs returned HTTP 200. The older port-8790 experiment was not restarted or modified. No phone result has been observed yet. The previously passing automated staging browser tests include local/computer selection, pending edits, reload, drafts, conflict/retry handling and account isolation.
