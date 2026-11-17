# Sync hosting and authentication evaluation

Reviewed 2026-11-16. Status: proposal, no provider selected or connected, no paid resource created. The LAN prototype passed owner-reported Xiaomi 13/computer checks; this is not a public production service. Test evidence is in [VALIDATION.md](VALIDATION.md).

## Recommendation

Evaluate a single paid Python service with a persistent SQLite volume first. This is an engineering recommendation based on reusing the tested write-order and retry protocol, not a decision to purchase or deploy. Render is the first candidate; Fly.io is an alternative. A free-only requirement would justify a separate Workers/D1 feasibility spike rather than placing SQLite on an ephemeral free filesystem.

A monthly budget and mainland-China access requirement remain to be confirmed by the owner. No actual China reachability, hosted latency, authentication delivery, or billing measurements exist. Official documentation is not evidence of regional reachability. Obtain current plan quotes for compute, persistent storage, backup storage, outbound traffic, authentication and email before selecting a paid pilot. Do not infer a total from a provider's headline compute price.

## Shortlist

| Candidate | Verified platform property | Implication for this project |
| --- | --- | --- |
| Render paid web service + persistent disk | Disk-backed files persist across deploys/restarts; free web services cannot attach persistent disks. | Closest candidate to the current Python/SQLite implementation. Use one writer service; establish downtime tolerance, off-service database backups and restore tests before a pilot. |
| Fly.io Machine + volume | Machine root filesystems are ephemeral; volumes provide local persistent storage tied to the Machine's physical server. | Another Python/SQLite candidate; placement, recovery and any redundancy need an explicit operating plan. A persistent volume alone does not prove high availability. |
| Cloudflare Workers + D1 | D1 has a Worker database API; documented database-size, request and recovery limits apply. | Requires porting the HTTP and transaction implementation. Prove atomic acceptance/deduplication, read consistency and rollback under concurrency; similarity to SQLite is not proof of unchanged semantics. |

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

1. Confirm budget, required regions and preferred sign-in method; choose hosting and identity provider using current quotes and actual reachability tests.
2. Replace the development HTTP server with a supported production application stack, HTTPS-aware trusted-proxy/origin configuration and bounded request processing. Preserve the tested protocol and all synthetic regressions.
3. Add consistent SQLite backups using the database backup API, encrypted off-service copies and restore drills. A restored database must not silently reuse a service identity with missing acknowledged revisions: define epoch/cursor recovery and preserve client outboxes. Disk snapshots alone are not a demonstrated database backup strategy.
4. Add retention, account deletion, pagination/limits for history and local multi-tab coordination. Bound polling/backoff and measure traffic at expected device counts; the 84-byte idle JSON result excludes headers, TLS, requests and billing overhead.
5. Build an isolated staging Calendar integration with separate storage/account namespaces. Export a backup before any opt-in transfer of existing local notes. Keep personal production notes out of the experiment.
6. Run hosted tests for simultaneous saves, lost acknowledgements, outages, expired sessions, account isolation, backup restore, mobile lifecycle and reload. Repeat physical-device checks over separate networks with HTTPS.

Provisioning is a subsequent step after provider, budget and region choices are concrete. This evaluation changes documentation only; it neither deploys the local prototype nor enables synchronization in the public Calendar.
