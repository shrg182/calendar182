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

This local test uses HTTP, without encryption or Secure cookies. Use fake notes only. Production hosting requires HTTPS and production authentication. iPhone/local-network browser behavior, real device reachability, and regional cloud reachability have **not** been tested. No network-wide listener was started during automated testing.

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

This experiment tests a small dedicated sync-service approach. It does not validate OneDrive, another personal-drive provider, cloud costs or deployment. It is not integrated with the live app’s outbox or note history. Physical two-device checks remain outstanding.

Production still needs hosting/provider selection, HTTPS, normal user authentication and account recovery, rate limits/abuse protection, operational backups, retention and deletion policies, multi-tab coordination, browser/PWA lifecycle tests, full payload/schema hardening, session-expiry recovery UX, diagnostics without private content, and a two-physical-device acceptance record. A lost-ack test or an empty response measurement does not establish production readiness.

References: [SQLite transaction control](https://docs.python.org/3/library/sqlite3.html#transaction-control), [IndexedDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction), [cookie attributes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).
