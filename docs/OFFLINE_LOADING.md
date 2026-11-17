# Offline Calendar staging

Implemented on sync-prototype; ordinary/public Calendar is unchanged. Physical iPad offline acceptance is deferred by the user; no certificate trust approval was given.

## Behavior

After one connected visit in a secure browser context, the staging build precaches its HTML, generated JavaScript/CSS, favicon and dependency license. A content-derived worker version pins each shell to its own cache. API requests, credentials, note responses and arbitrary resources are never put in Cache Storage. Notes/history/outbox stay in their existing account-specific IndexedDB.

A separate device registry remembers only the last confirmed account/service labels, never a token. If opening Calendar cannot reach the service or sign-in has expired, those labels let the user access that account's saved local notes. This local access does not authenticate a server request. Saved offline edits remain queued. When networking returns, the app verifies the same account and service identity before synchronizing; expired authentication shows the existing reconnect form without replacing drafts. A paused local-only selection remains paused.

First-time offline visitors still need one connected sign-in. Unsaved drafts remain in memory and are not recovered after a user-initiated close/reload. Save before closing. This update adds offline browser loading, not a complete home-screen installation or production account system.

## Safe app updates

An updated worker installs into a new cache and waits while existing Calendar tabs are open. It never calls skipWaiting or forces a reload. The notice asks users to save drafts, close all Calendar tabs, then reopen. Only after the previous version has no clients does the new worker activate and remove this app's old shell caches; IndexedDB is never cleared. A failed install deletes its incomplete new cache and leaves the working version available. Pending saved operations survive the update.

## HTTPS requirement

Service workers require a secure context. Loopback localhost is allowed for desktop development; the plain-HTTP LAN address used in the earlier iPad tests is not. A normal trusted HTTPS origin is required for iPad offline reopening. See [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

The app displays this limitation on HTTP LAN origins instead of claiming offline availability. Do not bypass browser certificate checks or disable security flags for device acceptance.

## Prepared local HTTPS test

This uses the same free computer-hosted service, without cloud hosting or a paid plan. The existing HTTP endpoint is retained:

- Existing HTTP Calendar: `http://192.168.68.58:8791/calendar/`.
- Separate HTTPS Calendar: `https://192.168.68.58:8792/calendar/`.
- Public iPad test profile: `http://192.168.68.58:8791/calendar/local-ca.mobileconfig`.
- Public certificate: `http://192.168.68.58:8791/calendar/local-ca.cer`.

`prepare_local_https.py` generated a 365-day local CA and a 90-day server certificate for the current LAN IP, 127.0.0.1 and localhost. Private keys and generated certificates are in ignored `prototype/sync/.data/local-https/`; private keys have owner-only permissions. No OS, browser or device trust was installed or changed. The profile contains one root-certificate payload, no MDM enrollment, VPN or other settings. The server serves parsed public certificate/profile bytes only, not keys.

Prepared CA SHA-256 fingerprint (2026-11-17):

```text
85:F8:8C:E0:1A:8A:90:94:09:34:02:A7:91:E7:80:2A:07:ED:9B:D4:85:4E:44:FD:46:C9:9C:E0:1F:5F:78:F0
```

Installing/trusting this root changes the device's certificate trust. That is an explicit user step, not automatic app setup. Keep the CA private key private. The local profile can be removed after testing from Settings → General → VPN & Device Management. See Apple's instructions for [installing profiles](https://support.apple.com/en-gb/102400) and [trusting manually installed certificate profiles](https://support.apple.com/en-us/102390).

If the user elects to test:

1. Save any current drafts. In iPad Safari, download the prepared local-test profile; inspect that it is Calendar182 Local HTTPS Test with only the Calendar182 Local Test CA certificate.
2. Install the downloaded profile through Settings. Enable Calendar182 Local Test CA in Settings → General → About → Certificate Trust Settings. Do not enable unrelated certificates.
3. In Chrome, open the HTTPS Calendar without certificate warnings, connect account-a with its existing private test token, and wait for Offline app ready.
4. HTTP and HTTPS have separate browser storage. Existing HTTP local notes/drafts/pending writes stay on the HTTP origin. The same server's accepted synthetic records download to the HTTPS client after sign-in; no browser database is migrated or cleared.
5. Disconnect networking, reload the HTTPS page, open saved notes, save a synthetic edit, then reload again offline. Reconnect and verify computer convergence. Do not claim physical acceptance until observed.

HTTPS uses a separate Secure/HttpOnly/SameSite cookie name so it does not overwrite the HTTP test cookie. Certificate trust is not a substitute for production authentication.

## Commands

From the repository root:

```sh
npm run build:computer
python3 prototype/sync/prepare_local_https.py --ip 192.168.68.58
python3 prototype/sync/server.py --host 0.0.0.0 --allow-host 192.168.68.58 --port 8791 --data-dir prototype/sync/.data/calendar-stage --calendar-dist prototype/sync/calendar-dist --ca-cert prototype/sync/.data/local-https/ca.pem
```

In another terminal:

```sh
python3 prototype/sync/server.py --host 0.0.0.0 --allow-host 192.168.68.58 --port 8792 --data-dir prototype/sync/.data/calendar-stage --calendar-dist prototype/sync/calendar-dist --certfile prototype/sync/.data/local-https/server.pem --keyfile prototype/sync/.data/local-https/server-key.pem --ca-cert prototype/sync/.data/local-https/ca.pem
```

Keep the computer awake. Do not start duplicate listeners on the same port. These are session-local processes, not installed startup services. If the LAN IP or certificate validity changes, inspect/reissue the certificate rather than disabling validation. The preparation script preserves existing keys and refuses partial certificate directories or invalid server certificates.

## Verification

- 17 application tests passed, including validated non-secret remembered identity and corrupt identity rejection; lint, TypeScript and both builds passed.
- 10 Python tests passed over HTTP/HTTPS: trusted certificate validation, invalid trust refusal, exact HTTPS Origin checks, Secure session cookie isolation, public certificate/profile payloads, asset allowlist and existing protocol guarantees.
- `prototype/sync/offline-clients.cjs` passed in isolated loopback Chrome contexts: real worker offline reload/edit/reload/reconnect, no cached API responses, local notes after expired-auth reload, failed install rollback, waiting update with two tabs/unsaved draft, saved note retained after activation and new shell reopening offline.
- Existing full Calendar synchronization/session-recovery suite passed after the offline integration.
- HTTPS endpoint was checked with its explicit CA and normal certificate/hostname validation. No insecure browser flags or system-trust changes were used. iPad HTTPS trust and offline reopening remain pending user action/observations.
