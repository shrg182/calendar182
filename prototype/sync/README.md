# Isolated two-client sync experiment

This is a test-note prototype with a real Python/SQLite HTTP service, not a cloud-provider mock and not production Calendar sync. It is kept outside `src` and `dist`. It never opens `calendar182.notes.v1` or contacts the original Health Calendar. The live GitHub Pages application remains local-only.

## Run on one computer

From the repository root (Python 3.10+):

```sh
python3 prototype/sync/server.py
```

Open http://127.0.0.1:8790/ in two separate browser profiles or browsers. Use **one tab per profile**. The desktop and phone-size browser clients in automated tests have independent cookies and IndexedDB; two ordinary tabs in one profile do not represent two devices.

The server generates `prototype/sync/.data/test-credentials.json` with restrictive permissions. Open that local file privately and use **account-a** with its token in both clients. Tokens are not printed by the server or committed. **account-b** provides a separate account for isolation tests. The directory also contains SQLite state and hashed, expiring sessions; preserve it across server restarts. Never post its contents in issues or commits.

Use only synthetic test notes. These credentials and sessions are for a local experiment, not a production account system.

## Test with a physical phone and computer

The same service can be exposed deliberately to a trusted home LAN for test notes only:

```sh
python3 prototype/sync/server.py --host 0.0.0.0 --allow-host YOUR_COMPUTER_LAN_IP
```

Replace the placeholder with the computer’s actual local IP address. Open `http://YOUR_COMPUTER_LAN_IP:8790/` on both devices using the same test account/token. Both must be on the same reachable network; the computer must stay awake and its firewall must permit that local connection. Use the LAN URL on the computer too, because a different URL has different browser storage. No router port forwarding or internet exposure is needed.

This local test uses HTTP, without encryption or Secure cookies. Use fake notes only. Production hosting requires HTTPS and production authentication. Xiaomi 13 LAN reachability was confirmed by the owner on 2026-11-16 (see the physical-device update below). iPhone/local-network browser behavior and regional cloud reachability have **not** been tested. No network-wide listener was started during automated testing.

## Manual acceptance checklist

1. Save on computer A; verify phone B receives it automatically or via Sync now. Edit on B and verify A.
2. Turn off B’s connection after loading the editor. Save a note; it should say saved locally/pending. Reconnect and check convergence.
3. While B is offline, edit the same date on A. When B later uploads, B’s later server-accepted write intentionally becomes current. Both texts must remain in recovery history.
4. Leave a draft in B’s editor while A syncs another version. B’s draft must remain untouched.
5. Delete a note; sync both; verify the deletion. Recovery history → Copy to draft → Save creates an explicit recovery operation.
6. Reload after an offline save once the service is reachable. Pending operations must survive and upload. An offline reload of the app shell is not implemented.
7. Restart the server with the same data directory; retry sync. Service identity, revisions, deduplication and sessions remain durable.
8. Run repeated unchanged syncs. Diagnostics should show small empty change responses, not the whole note archive.

For deterministic scenario control, uncheck Automatic sync on both clients and use Sync now. Automatic mode syncs after saves, opening/resuming and reconnection, then polls every 15 seconds with retry backoff up to 60 seconds. It only works while the page is open. On session expiry, reload and reconnect with the test credentials; local test data remains in its account-specific IndexedDB.

## Protocol

- An account’s accepted operations have a unique `(account, operation ID)` and immutable content. Reusing an ID with different content is rejected.
- `POST /api/operations` checks the service epoch. A SQLite `BEGIN IMMEDIATE` transaction serializes acceptance, appends the change and advances that date’s canonical revision. The response is sent after commit.
- A retry returns its original accepted revision. It does **not** create a later revision or make that old operation canonical again.
- A browser’s local note and ordered outbox entry commit together in a separate prototype database. Acknowledgement removes only that exact queued operation. A newer local edit cannot be removed by an older acknowledgement.
- `GET /api/changes?cursor=N&limit=100` returns only that account’s later revisions, ordered and paginated. Applying a page and advancing the local cursor share one IndexedDB transaction. A pending local edit remains visible while remote revisions are retained in history.
- Server timestamps and device clocks do not select the winning version. SQLite revisions do. A downloaded record is not a new edit.
- Deletions are retained events; earlier text remains recoverable. The server keeps all changes in this prototype; history requests return the newest 100 versions for a date. There is no pruning or cursor/tombstone expiration yet.
- A persistent epoch prevents silently treating a replacement database as the same sync service. If it changes, export local test data and investigate; do not clear the outbox to bypass the error.
- Per-account access is enforced on the server. Sessions are HttpOnly, SameSite=Strict and expire after 24 hours. Writes require the same Origin/Host; static serving is an explicit whitelist; no permissive CORS or credential logging is enabled.

## Automated verification

```sh
python3 -m unittest discover -s prototype/sync -p 'test_*.py' -v
PLAYWRIGHT_PATH=/path/to/playwright node prototype/sync/two-clients.cjs
```

The browser test starts its own real service on a temporary localhost port, generates isolated test credentials, and removes its synthetic test data afterward. It requires installed Chrome and Playwright; it does not touch personal browser profiles.

Verified on 2026-11-16:

- Six Python service tests: retry identity, concurrent serialization, offline late acceptance, deletion/history, SQLite restart persistence, account isolation, 205-record pagination, empty idle responses, validation, same-origin/auth/session-cookie/expiry controls, and service-identity checks.
- Two independent Chrome clients (desktop and phone viewport), plus a third account-isolation context: bidirectional edits, offline edits, preserved unsaved drafts, deletion, a committed upload whose HTTP response is dropped, retry after a later competing edit, pending operations across reload, recovery through a new explicit save, and automatic synchronization without pressing Sync now.
- Measured unchanged sync response: **84 JSON body bytes**, with no note text. This excludes HTTP headers, TLS, connection overhead and any provider billing calculations.

## Remaining decisions before production

This experiment tests a small dedicated sync-service approach. It does not validate OneDrive, another personal-drive provider, cloud costs or deployment. It is not integrated with the live app’s outbox or note history. Initial physical two-device results are recorded below; remaining scenarios are still outstanding.

Production still needs hosting/provider selection, HTTPS, normal user authentication and account recovery, rate limits/abuse protection, operational backups, retention and deletion policies, multi-tab coordination, browser/PWA lifecycle tests, full payload/schema hardening, session-expiry recovery UX, diagnostics without private content, and a two-physical-device acceptance record. A lost-ack test or an empty response measurement does not establish production readiness.

References: [SQLite transaction control](https://docs.python.org/3/library/sqlite3.html#transaction-control), [IndexedDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction), [cookie attributes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

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

## Calendar UI staging build — 2026-11-17

The full Calendar interface now has a separate computer-sync build. It is isolated from the ordinary Calendar and the standalone test editor; use fake notes only. Build from the repository root:

```sh
npm run build:computer
python3 prototype/sync/server.py --port 8791 --data-dir prototype/sync/.data/calendar-stage --calendar-dist prototype/sync/calendar-dist
```

Open `http://127.0.0.1:8791/calendar/`. Privately open `prototype/sync/.data/calendar-stage/test-credentials.json` and connect account-a with its generated token. Use the same account on two separate browser profiles. The service at port 8790 and its original database need not be stopped or changed. Generated staging assets and `.data` files are ignored by Git. Rebuild and reload after source changes. The normal `npm run dev` / public Calendar stays local-only.

For a physical phone test, explicitly add `--host 0.0.0.0 --allow-host YOUR_COMPUTER_LAN_IP` and use `http://YOUR_COMPUTER_LAN_IP:8791/calendar/` on both devices. This is a trusted-LAN HTTP experiment, not public hosting. Do not use router port forwarding. The browser storage origin differs from the loopback address, so notes do not automatically carry over between those URLs.

The build supports Calendar notes, delete/history recovery, local backup export/import, durable pending edits, explicit Sync now and automatic sync. Imported records create fresh operations and will upload to the connected test account; import synthetic backups only. Saved drafts are cleared from the in-page draft map so subsequent remote edits/deletions become visible, while unsaved drafts remain intact. Remote-version timestamps reflect local receipt, not server acceptance time; server revisions decide order.

Verification uses a temporary service/data directory and independent Chrome contexts, without personal profiles or the retained experiment database:

```sh
PLAYWRIGHT_PATH=/path/to/playwright node prototype/sync/calendar-clients.cjs
```

Run `npm run build:computer` first. The existing `two-clients.cjs` still checks the standalone editor separately. This integration does not establish production readiness or physical-phone acceptance for the Calendar build. Cloud connectors, safe provider migration, production login, offline app-shell availability and general multi-tab consistency are still outstanding. Use one tab per browser profile. A changed service identity must be investigated with a backup; do not clear pending notes to bypass it.

### Choosing local or computer synchronization

In the Calendar staging build, open Settings → Storage options. Choose **This device** to pause synchronization, or **Your computer** to resume and upload pending saved edits. The selection survives reloading and applies only to that account's staging notes. Notes/history/drafts are kept in place; remote copies are not deleted. Controls wait for an ongoing sync to finish before switching. Choosing This device disables Sync now as well as automatic synchronization. The separate Automatic sync checkbox only controls scheduling and does not change the selected storage mode.

Cloud entries remain disabled, and switching accounts or migrating data between providers is not implemented. Rebuild with `npm run build:computer` and reload the staging page to use these controls.

### Reconnecting after sign-in expires

If an open Calendar loses its test session, note synchronization stops and a **Reconnect same account** form appears above Calendar. Enter that account's generated test token. No page reload is needed: notes, pending edits, Settings selection and unsaved drafts stay in place. A rejected token is cleared; it does not switch accounts. Successful reconnection resumes pending saved edits only when Your computer is selected. Reconnecting while This device is selected keeps synchronization paused.

This flow deliberately cannot move notes to another account or bypass a changed service identity. If the identity changes, export a local backup and investigate before proceeding. Tokens are held only in the form state and sent to the existing same-origin test login endpoint; they are not saved in browser storage. This remains test authentication, not a production account/recovery system. Offline page reload and signing back in after a full page reload remain separate lifecycle work.

## Offline reopening and local HTTPS

The staging build now includes a versioned app-shell worker, remembered non-secret account labels for local access while disconnected, and waiting updates that never force reloads. Saved offline edits survive reload and resume after same-account/service verification. Unsaved drafts still require explicit Save before closing/reloading.

The previous HTTP LAN address cannot support service workers on iPad. A separate local HTTPS test endpoint and certificate/profile preparation are available; no device trust settings are changed automatically. See [offline behavior, HTTPS setup, trust steps and test evidence](../../docs/OFFLINE_LOADING.md). The normal/public Calendar build has no worker registration from this change. Certificates and private keys must remain in ignored `.data` paths.

Browser verification (build first):

```sh
PLAYWRIGHT_PATH=/path/to/playwright node prototype/sync/offline-clients.cjs
```
