# Sync hosting and authentication evaluation

Reviewed 2026-11-16. Status: proposal, no provider selected or connected, no paid resource created. The LAN prototype passed owner-reported Xiaomi 13/computer checks; this is not a public production service. Test evidence is in [VALIDATION.md](VALIDATION.md).

## Recommendation

Owner constraint: **free services only**, confirmed 2026-11-16. Do not enable paid plans, paid add-ons or metered paid fallback. Paid Python hosting is excluded from the current pilot.

Evaluate Cloudflare Workers Free + D1 Free with an isolated local feasibility implementation first. This is a candidate, not a selected or deployed provider. Port the tested acceptance/retry protocol and validate it against D1's runtime before connecting any Calendar data. Preserve the working Python LAN experiment as a reference.

The mainland-China access requirement remains unanswered. No actual China reachability, hosted latency or authentication delivery measurements exist; provider documentation does not prove reachability.

### Verified free-tier envelope

As documented on the review date, Workers Free includes 100,000 requests/day and 10 ms CPU per invocation. D1 Free includes 5 million rows read/day, 100,000 rows written/day, 5 GB total storage, and a 500 MB per-database size limit. Limits apply at account level where specified, so other projects share allowances. D1 returns errors when daily query limits are exhausted; clients must preserve local notes/outboxes and retry later, never upgrade automatically.

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing and exhaustion behavior](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

Planning arithmetic, not a load-test result: a device polling once every 15 seconds for 24 hours makes 5,760 change requests/day. Two devices make 11,520 before login, saves and other requests. Suspend polling when hidden, back off failures and measure indexed row reads plus authentication/session overhead. This calculation does not prove service capacity or end-to-end availability.

Free sign-in remains to be selected: verify that the chosen identity provider's free plan covers hosted sign-in, required recovery and the pilot's active users without paid email/SMS or other add-ons. The earlier Auth0 example establishes an authentication pattern, not a verified free end-to-end identity solution. Provisioning and public deployment remain pending.

## Shortlist

| Candidate | Verified platform property | Implication for this project |
| --- | --- | --- |
| Render paid web service + persistent disk (excluded: paid) | Disk-backed files persist across deploys/restarts; free web services cannot attach persistent disks. | Closest candidate to the current Python/SQLite implementation. Use one writer service; establish downtime tolerance, off-service database backups and restore tests before a pilot. |
| Fly.io Machine + volume (excluded from free-only pilot) | Machine root filesystems are ephemeral; volumes provide local persistent storage tied to the Machine's physical server. | Another Python/SQLite candidate; placement, recovery and any redundancy need an explicit operating plan. A persistent volume alone does not prove high availability. |
| Cloudflare Workers Free + D1 Free (current candidate) | D1 has a Worker database API; documented database-size, request and recovery limits apply. | Requires porting the HTTP and transaction implementation. Prove atomic acceptance/deduplication, read consistency and rollback under concurrency; similarity to SQLite is not proof of unchanged semantics. |

Sources checked: [Render disks](https://render.com/docs/disks), [Render free-service limitations](https://render.com/docs/free), [Render pricing](https://render.com/pricing), [Fly volumes](https://docs.fly.io/volumes/overview), [D1 API](https://developers.cloudflare.com/d1/worker-api/d1-database/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/). Prices and limits should be rechecked when provisioning.

OneDrive remains a separate personal-storage candidate, not an interchangeable host for the Python service. No provider has demonstrated the application's serialization/deduplication contract through a personal-drive API. Keep that investigation separate from the already-tested dedicated-service protocol.

## Authentication design

Replace shared account-a/account-b test tokens before any public pilot. Proposed design: a managed OpenID Connect identity provider, hosted sign-in, authorization-code flow with PKCE, and server-side session handling. Auth0 is one documented implementation candidate, not a selected dependency. Its documentation explains why browser applications cannot retain a client secret and describes PKCE: [Auth0 flow documentation](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce).

For the first pilot, serve a separate Calendar build and its API on one HTTPS origin. This is a design recommendation to keep session handling same-origin. The GitHub Pages preview can remain unchanged. Retaining Pages with a cross-site API would require a separate browser-tested authentication/CORS/cookie design; do not weaken origin checks to make the HTTP prototype work remotely.

Implementation requirements:

- Use an established OIDC library; validate state, nonce, issuer, audience, signature and token expiry as applicable. Identify accounts by immutable issuer/subject, not a caller-supplied account name or email alone.
- Keep provider secrets and tokens on the server where possible. Set opaque session cookies Secure, HttpOnly and with an appropriate SameSite policy; implement session rotation, expiry, revocation and logout. Test redirect completion and CSRF protection rather than copying the prototype's HTTP origin checks unchanged.
- Require authentication and account scoping for every data operation. Add login and write rate limits, request/time limits, safe diagnostics and account-recovery tests.
- Reauthentication must preserve pending operations and drafts. Never attach a previous account's pending notes to a different account. Logout/account switching must explicitly handle unsynced data.
- Verify sign-in, recovery email/social-provider availability, cookie behavior and reconnect on the actual Xiaomi browser and in every required region. Evaluate provider pricing and recovery features before selection.

## Work before an external pilot

1. Keep the confirmed free-only budget. Confirm required regions and preferred sign-in method; verify hosting/authentication free-plan eligibility, limits and actual reachability.
2. Implement a separate local Workers/D1 feasibility spike. Prove atomic write ordering, immutable operation IDs, lost-ack retries, account isolation, pagination and rollback with the D1 runtime. Add HTTPS-aware origin/session handling and bounded request processing before public deployment.
3. Define D1 export/recovery and an independent backup procedure that uses free resources, then exercise restore drills. Retain consistent SQLite backups for the reference experiment using the database backup API. A restored database must not silently reuse a service identity with missing acknowledged revisions: define epoch/cursor recovery and preserve client outboxes. Disk snapshots alone are not a demonstrated database backup strategy.
4. Add retention, account deletion, pagination/limits for history and local multi-tab coordination. Bound polling/backoff and measure traffic at expected device counts; the 84-byte idle JSON result excludes headers, TLS, requests and billing overhead.
5. Build an isolated staging Calendar integration with separate storage/account namespaces. Export a backup before any opt-in transfer of existing local notes. Keep personal production notes out of the experiment.
6. Run hosted tests for simultaneous saves, lost acknowledgements, outages, expired sessions, account isolation, backup restore, mobile lifecycle and reload. Repeat physical-device checks over separate networks with HTTPS.

Provisioning is a subsequent step after provider, budget and region choices are concrete. This evaluation changes documentation only; it neither deploys the local prototype nor enables synchronization in the public Calendar.
