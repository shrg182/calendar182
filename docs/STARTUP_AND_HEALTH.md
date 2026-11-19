# Mac startup and backup status

Installed on 2026-11-19 for the signed-in owner. Two per-user LaunchAgents run the existing HTTP (8791) and HTTPS (8792) Calendar services. They start at Mac sign-in and restart after process exit. They use the existing database, credentials, certificates and selected iCloud Drive backup destination. The Mac must remain awake and signed in; no power or certificate-trust settings were changed.

## User check

1. Save any unsaved note before reloading.
2. Open http://192.168.68.58:8791/calendar/ and reload once.
3. Open Settings → Computer service & backups.
4. Check Service startup says **Automatic at Mac sign-in**, Automatic backups says **Running**, and both snapshot/copy timestamps appear without an error.
5. Use **Refresh backup status** to check again. Destination verification means the local selected-folder copy passed checks; it does not confirm a new iCloud upload.

An actual sign-out/reboot test remains pending. At a convenient time, save drafts, restart the Mac, sign back in, then open the same address from iPad without starting Terminal services. Do not reboot until ready to interrupt other work.

## Maintenance

From the repository:

```sh
python3 prototype/sync/manage_service.py status
```

Definitions are `~/Library/LaunchAgents/com.ruixing.calendar182.http.plist` and `com.ruixing.calendar182.https.plist`. Private logs are under `prototype/sync/.data/calendar-stage/logs/`. The repository, Python runtime and data paths must stay available. If the LAN IP changes, review/reprepare the definitions before reinstalling; existing differing definitions are intentionally not overwritten.

The manager's `uninstall` command stops/removes only these Calendar jobs and preserves data/backups. It interrupts sync; use only when intentionally disabling startup. `prepare --lan-ip ADDRESS` generates private definitions and `install` installs them after preflight. Installation refuses occupied ports and never kills an unknown listener.

## Evidence and limits

Both installed jobs ran with authenticated healthy backup reports and verified destination-copy timestamps. Fresh-snapshot comparison preserved live service identity and note/history counts. Stopping each managed process produced a new running PID automatically. Actual sign-in/reboot acceptance and the owner's Settings-panel check remain pending. Main/public deployment and iPad certificate trust remain unchanged.
