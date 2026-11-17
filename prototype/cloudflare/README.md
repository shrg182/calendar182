# Local Workers/D1 feasibility prototype

This isolated API adapter exercises the sync protocol in Miniflare's local Workers/D1 runtime. No Cloudflare account, paid plan, remote database or public deployment is used. It does not read the LAN prototype database or Calendar's browser notes. The working Python phone/computer experiment remains separate.

## Run

Node 24 and npm, from the repository root:

```sh
npm ci --prefix prototype/cloudflare
npm test --prefix prototype/cloudflare
```

Local runtime sockets and subprocesses must be allowed. Dependencies and the lockfile are isolated from the application. Miniflare is pinned; patched `undici` and `sharp` overrides resolve the advisories reported on initial install. The nine runtime tests passed with those overrides; npm install reported zero vulnerabilities afterward. Recheck advisories when updating dependencies.

The tests start temporary local runtimes, inject the schema and synthetic identities, and dispose the runtimes afterward. The restart check uses a temporary persistent D1 directory. There is no deployment configuration or deploy script.

## Implementation

- `schema.sql`: append-only accepted operations, account/revision and account/date/revision indexes, durable service epoch and an immutable operation identity trigger.
- `worker.mjs`: API-compatible operations, incremental changes and bounded history. A D1 atomic batch inserts or deduplicates an operation and selects its acknowledgement. The trigger rejects changed payloads before conflict handling. Retrying an old accepted ID returns its original revision, never appends a newer canonical edit. Latest accepted revision for a date determines canonical order; no device clock is used. Unlike the reference service, there is no materialized `current` table; clients fold ordered changes and the newest history entry is canonical for its date.
- Primary-first D1 sessions keep sequential requests in a handler consistent. Schema initialization happens outside requests. A restore must rotate service identity if acknowledged revisions have been lost; this prototype does not implement restore administration.
- Invalid dates/text, reused IDs, wrong epoch, bad cursors, oversized/malformed bodies and cross-origin writes are rejected. Unexpected storage errors return 503 without acknowledging a write. Error responses omit SQL and note contents.

## Local results — 2026-11-16

Nine tests passed against Miniflare D1:

1. Lost-acknowledgement retry after a newer edit, immutable ID conflicts and preserved canonical order.
2. Twenty concurrent distinct writes, ten concurrent retries and simultaneous conflicting payloads for one ID.
3. 205-record incremental pagination, account isolation and an idle JSON body below 160 bytes.
4. Deletion, late offline acceptance and explicit recovery with retained history.
5. Invalid dates, empty/oversized text, invalid Unicode, wrong epoch, oversized JSON and invalid pagination leave no accepted edits.
6. A failing later statement rolls back an earlier insert in the same D1 batch.
7. Injected storage failure returns a retryable error; resending the same operation after recovery succeeds once.
8. Public-host refusal, local identity enforcement and same-origin write protection.
9. Persistent local D1 runtime restart retains service epoch, records and original retry acknowledgement.

Storage-failure injection is not an actual Cloudflare quota test. Runtime restart tests local persistence, not remote platform durability or disaster recovery. Request/CPU quotas, billing, regional reachability, hosted latency and physical-device use of this adapter have not been verified. These tests do not rerun the Python experiment's UI/draft/offline browser suite against D1.

## Authentication and next step

This is **not production authentication**: tests inject `X-Local-Test-Account` and set `LOCAL_TEST_ONLY=true`. The handler refuses non-loopback request URLs even with those bindings. Do not remove that gate or publish this adapter before real authentication is implemented. No login form, session endpoint or browser client is served here.

Next: choose a verified free identity option, implement HTTPS sessions/account isolation and integrate the existing synthetic browser scenarios with this adapter. Then validate actual free-tier quotas and reachability before any Calendar integration. Keep the owner's free-services-only constraint; do not enable a paid plan or add-on.

References: [D1 batch transaction semantics](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch), [D1 sessions](https://developers.cloudflare.com/d1/worker-api/d1-database/#withsession), [Workers Free pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 free limits](https://developers.cloudflare.com/d1/platform/limits/).
