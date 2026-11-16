# Calendar requirements update

Date: 2026-11-16
Basis: Product-owner clarification following the design review.

This document supersedes earlier review suggestions to defer all synchronization until after the initial release. Original design files remain unchanged. Implementation details below are proposals unless explicitly identified as owner requirements.

## Owner requirements

1. Reliable cross-device use is essential. The reported Supabase egress restriction and resulting loss of sync are the principal problem to solve.
2. Preserve the useful features and functionality of Health Calendar. Verify this through a source audit and feature parity matrix.
3. Deliver a polished, mobile-first interface comparable in usability to established calendar applications.
4. Include basic automatic sync in the first release. Multiple provider choices and complex deployment options may follow later.
5. Explain any significant calculation difference from the existing app, including evidence of accuracy and the practical advantage.
6. The latest successful synchronization is authoritative. Specify ordering and recovery so this rule is predictable across devices.
7. Continue with the discovery and design recommendations, adjusted to these priorities. This does not authorize changes to the existing production app or database.

## Initial read-only findings

A local reference repository exists at `/Users/ruixingshi/Python/health-calendar`. The following observations come from an initial inspection of its README and sync-related source; this is not a complete feature or security audit, and no tests or live database checks were run.

- `notes.js`, `synchronize()`: after pending uploads, calls `cloud.read()` and applies the returned records.
- `notes.js`: schedules `synchronize()` every 60 seconds; the function exits when signed out or already busy. Other events can also trigger synchronization.
- `sync.js`: `read()` calls the `read_daily_notes` database function without a change cursor.
- `supabase/schema.sql`: `read_daily_notes()` returns the complete account snapshot, including note text and deletion markers.
- Consequently, successful idle syncs can repeatedly download unchanged note history. This is a plausible egress contributor, not a verified explanation of the production incident. No usage dashboard, incident notice, request metrics, or production logs have been examined.
- The README documents server revisions and conflict checks for notes. Shensha preferences use a separate last-successful-save rule and Auth metadata. The replacement design must account for both data paths.
- The README documents approximate solar-term calculations, twelve month boundaries, local-noon evaluation, and a civil-midnight day change. These are important parity and accuracy decisions, not evidence that every existing result is wrong.

Supabase's official egress guidance is a reference for investigation: <https://supabase.com/docs/guides/platform/manage-your-usage/egress>. Switching providers alone does not establish lower traffic or prevent future quota exhaustion.

## Proposed first-release scope

- React + TypeScript + Vite UI, with independent deterministic engines and storage services.
- Verified existing calendar modes, notes, languages, Shensha rules/settings, installation, backups, and update behavior.
- Offline local saves and a durable queue for changes awaiting upload.
- One supported automatic synchronization service, tested on at least two devices.
- Visible distinction between “Saved on this device”, “Pending sync”, “Synced”, and “Sync failed”. Never label a local-only save as synchronized.
- Sync on relevant edits, app opening/resuming, reconnection, and explicit Sync now. Use a measured foreground refresh interval with backoff; avoid needless full-history pulls. Do not promise closed-app background sync in a browser PWA.
- Incremental change retrieval, bounded pagination, retry-safe uploads, and deletion propagation.
- No dependency on an AI provider for core functions. Assistant and additional provider adapters are deferred.

## Proposed latest-sync rule

Use server-assigned revisions or a provider's equivalent authoritative revision order, per record. Phone clocks and the time of a download do not decide which edit wins. Downloading an old record does not make it a new revision.

1. A local edit is saved immediately and marked pending; it is not yet authoritative on other devices.
2. The service serializes accepted writes and assigns revisions. The last successfully accepted edit for the same record becomes canonical.
3. An offline device can submit an older edit later. Under this proposed rule, if accepted, it becomes the newest revision and replaces the previous canonical value. This is an intentional consequence of latest-successful-sync-wins, even if the text was typed earlier.
4. Preserve the superseded version and the pending version until the outcome is known. Keep recoverable history with an explicit retention policy to be decided before release. Do not block routine use with mandatory conflict dialogs under this policy.
5. Deduplicate retried operations using operation IDs, so a lost response cannot make a retry overwrite a later edit as if it were new work.
6. Apply this per note/date, not by replacing the entire account with a device snapshot. Treat Shensha selections as one versioned settings record unless a finer merge is separately designed.
7. Treat deletion as a versioned change. Define deletion recovery and tombstone retention, including devices returning after long offline periods.
8. Keep unsaved editor drafts separate from synchronization. Never silently replace text currently being typed; indicate that a remote revision arrived.

These details make the owner's latest-sync preference operational. They replace the earlier recommendation to require manual resolution for every competing note edit. Recovery history remains necessary because sync and backup serve different purposes.

## Backend decision gate

Do not build a provider chooser before one path works reliably. Evaluate the smallest deployable service against:

- incremental reads and safe conditional/serialized writes;
- supported browser authentication, account isolation, and token handling;
- request/egress costs under measured usage and quotas;
- operational effort, backup, recovery, and exportability;
- actual target-region and mobile reachability;
- implementation complexity and compatibility with the latest-sync policy.

The existing shared Supabase service must not remain the sole dependency by assumption. Whether to use a new managed service, one personal-cloud provider, or a separately operated small sync backend remains an evidence-based decision. No replacement provider has yet been validated or selected. A database product name alone does not define the sync protocol or solve excessive transfer.

## Calendar accuracy policy

Preserve documented conventions first. Validate Gregorian/lunar conversion and solar terms against appropriate published references, and validate GanZhi/Shensha with explicit rule fixtures. Do not silently change conventions while describing the change as improved accuracy.

For each discrepancy, record the date/time, timezone, old output, proposed output, independent reference, cause, and user-visible consequence. Distinguish algorithm defects, approximations, browser differences, and legitimate convention differences. More precise solar-term instants could improve results near transitions, but could also change existing noon-based day or Shensha displays; demonstrate and explain this before adopting the change. No claim that a new engine is more accurate is justified yet.

## Release evidence

- Feature matrix includes all verified reference features; gaps are explicit.
- Mobile designs and real-device checks cover month/week/days/year views, day details, note editing, Shensha configuration, and long translations.
- Two devices converge after online edits, offline edits, deletes, reloads, and retries.
- Competing updates follow the documented latest-successful-sync rule and replaced data can be recovered.
- An unchanged account does not redownload its full note history each refresh. Capture request counts and bytes for representative histories; agree on a measured traffic budget before release.
- Test authentication expiry, provider outage, quota/rate limits, interrupted uploads, and account changes. Local work remains recoverable throughout.
- Backup/restore and app-update tests demonstrate recovery without losing drafts or queued changes.
- Original Health Calendar source, deployment, and production data remain unchanged.

## Next work

Complete `FEATURE_PARITY_MATRIX.md`, document current calculation conventions, compare candidate sync paths using current official documentation and a bounded prototype, and produce mobile screen designs. Then implement a vertical slice: edit a note on device A, synchronize, read it on device B, edit offline, reconnect, and verify both canonical ordering and recovery.
