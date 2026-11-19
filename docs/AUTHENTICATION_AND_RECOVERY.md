# Authentication and recovery review — 2026-11-19

This is a hardening increment for sync-prototype, not production authentication.

## Sign-in throttling

The service allows ten JSON sign-in attempts per network peer in each 60-second
monotonic-time window. All accounts and successful attempts share that peer's
budget. The next attempt returns HTTP 429 with Retry-After. Existing sessions,
notes, drafts and synchronization are unaffected. The UI advises waiting one minute.

A lock makes concurrent attempts share the budget. Expired entries are removed;
at most 1,024 peer entries are retained. At capacity, new peers must wait for an
entry to expire; active peer limits cannot be evicted to bypass throttling.
Forwarded headers are not trusted. Devices behind one proxy share a budget.
Each HTTP/HTTPS process has its own in-memory budget; restarting resets it.
This is basic local-service protection, not distributed abuse prevention.

## Existing recovery protections reviewed

Server restores target a new directory, validate snapshots, clear sessions and
rotate the service identity. Clients reject a changed identity before sending
queued operations. Reconnection requires the same account and identity. Saved
local exports and separately copied unsaved drafts must be preserved before any
manual reconciliation. Never clear browser data merely to bypass the mismatch.
A restored service must not automatically activate against old client cursors.

## Remaining requirements before production use

- Replace the two generated test-account tokens with an owner-approved identity,
  enrollment, revocation and recovery design. No new provider is selected here.
- Establish trusted encrypted transport on actual devices before real sensitive
  notes; the current HTTP test endpoint does not encrypt traffic. iPad certificate
  setup remains deferred and no trust settings are changed by this increment.
- Build an isolated reconciliation preview for client exports versus restored
  server history, explicitly handling missing acknowledged writes, pending
  operations, tombstones and conflicts before any cutover.
- Validate independent database download/restore from the backup destination;
  an iPad-readable manifest alone does not prove this.

## Verification and activation

31 Python service/backup/startup tests passed, including throttle expiry,
concurrency, bounded memory, unknown accounts and continued authenticated saves.
Client regression checks cover actionable HTTP 429 handling without retries.
The retained live services have not been restarted and still run the earlier
implementation. Their next restart will load the server change. The client
message requires rebuilding the staging bundle. No main/public deployment change.
