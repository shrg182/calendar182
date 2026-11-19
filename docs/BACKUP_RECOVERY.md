# Local sync database backups and recovery

Implemented for the Python computer-hosted service on sync-prototype. Main/public Calendar is unchanged. This does not back up unsaved drafts, browser-only operations that have never reached the service, credentials or TLS private keys.

## Automatic snapshots

Starting `prototype/sync/server.py` now enables private local SQLite snapshots by default:

- Check on startup and at least once per minute while the process is running; create a snapshot when the latest is at least one hour old.
- Retain up to 168 verified snapshots, approximately seven days of continuous hourly operation. Retention is a count, not a guaranteed time window.
- Directory: `<data-dir>/backups/`; for current staging this is `prototype/sync/.data/calendar-stage/backups/`.
- Options: `--backup-interval 3600 --backup-keep 168`. `--backup-interval 0` disables automatic creation.
- HTTP and optional HTTPS processes sharing the same data directory use a process lock and recent-snapshot check to avoid duplicate scheduled snapshots.

The service must be running and the computer awake. Mac sign-in startup is now installed and physically checked; see STARTUP_AND_HEALTH.md. Same-disk snapshots do not protect against losing that disk. The owner-selected iCloud Drive destination is enabled; see BACKUP_COPIES.md for verified-copy and independent-device verification limits. No paid service was enabled.

## Snapshot guarantees

The code uses SQLite's online backup API, including accepted writes still in WAL, rather than copying the live database file. It validates database integrity, required tables/service identity and agreement between current records and the latest accepted operation for every account/date. Snapshot sessions are removed; source sessions are unchanged. Operation IDs/revisions, tombstones and retained accepted history are preserved.

A snapshot is created in an owner-only temporary file, verified, flushed and atomically renamed before retention pruning. Only generated, strictly named snapshots are pruned; unrelated files, source files and previous verified snapshots are not deleted on copy failure. Directories are mode 0700 and snapshots 0600. This is access restriction, not encryption: snapshots contain readable note data. They remain ignored by Git and are never served by the HTTP asset handler.

A failed automatic attempt keeps older snapshots, prints a generic local error without note/token contents and retries later. It does not turn a note save into a failed save. Settings → Computer service & backups now reports snapshot and destination-copy health. There is no remote failure alert.

## Manual snapshot

From the repository root:

```sh
python3 prototype/sync/backups.py create --source prototype/sync/.data/calendar-stage/sync.sqlite3 --directory prototype/sync/.data/calendar-stage/backups
```

This command prints the verified snapshot path. Never commit that file. Account test tokens (`test-credentials.json`) and local HTTPS keys are separate files and are deliberately not included. Keep any chosen independent credential/key recovery copy private; it is not created automatically by this feature.

## Non-destructive restore drill

Use an actual verified snapshot filename and a destination that does not exist:

```sh
python3 prototype/sync/backups.py restore --snapshot PATH_TO_VERIFIED_SNAPSHOT --destination prototype/sync/.data/new-restore-drill
```

The command refuses any existing destination, including the live data directory. It validates before creating the new directory, copies into a temporary database, checks it again, rotates the service epoch and clears sessions, then atomically publishes `sync.sqlite3`. The input snapshot and running service are not replaced or modified. Test-only credentials are not copied; starting a separate service on that directory generates its own test tokens.

Identity rotation is intentional: acknowledged writes newer than the snapshot may be absent. Existing clients must not silently continue from their old cursor or replay under the old service identity. Their drafts/outboxes remain local, and sync refuses the mismatch. Export saved browser data (including pending operations) from every affected device before planning reconciliation; save/copy unsaved drafts separately. Do not clear browser data or outboxes merely to bypass the error.

A read-only comparison tool is now available; see [recovery preview](RECOVERY_PREVIEW.md). Reconciliation and production cutover are not automated. Review client exports and accepted history in an isolated recovery workspace before choosing a merge/import policy and moving a recovered service into use. Do not assume every client's partially divergent archive can be imported blindly. This feature restores the server snapshot; it does not promise recovery of writes never captured in that snapshot or browser-only drafts.

## Verification — 2026-11-19

Six new backup tests passed: live WAL/concurrent writes, private file permissions and session removal without changing source sessions, restore identity rotation with tombstones/original retry acknowledgements preserved, refusal to overwrite an existing target, retention/failure safety, malformed/inconsistent snapshot rejection, cross-process locking/recent-snapshot suppression, and repeated scheduler runs/failure recovery. All 16 Python service/backup tests passed together. The shared-tab browser suite also passed with automatic startup snapshots enabled, both with and without Web Locks/BroadcastChannel. Frontend code did not change in this task; frontend tests/builds were not repeated. Lint and whitespace checks passed.

A retained-data drill created a verified snapshot of 25 accepted operations/one current record and restored it into a separate ignored directory. Restored epoch differed, restored sessions were empty, operation/current counts matched, and the live epoch/operation/session counts were unchanged. Local evidence is `prototype/sync/.data/calendar-stage/last-backup-drill.json` (ignored). The live service was never restored/replaced.

Both retained staging services were restarted with default hourly/168 retention scheduling. HTTP and CA-verified HTTPS Calendar URLs returned 200; the live epoch still matched the pre-restart snapshot and live/snapshot operation counts were both 25. Device trust settings and main/public deployment were unchanged.

## Optional destination copies

The new `copy` / `verify-copy` commands and `--backup-copy-root` support verified bundles in an explicitly selected existing external-drive or cloud-folder root. This feature is disabled until a destination is chosen. It does not silently select the discovered OneDrive folder. Missing roots are not created and local backups continue if copying is unavailable. Bundle restore validates the checksum before the existing new-directory/epoch-rotation workflow. See [destination-copy workflow and limits](BACKUP_COPIES.md).

Selected destination update (2026-11-19): iCloud Drive/Calendar182Backups is now enabled on the retained services. A 25-operation copied bundle passed checksum and a separate local restore drill, and macOS reported both files uploaded. Independent-device download/restore is not yet verified. See BACKUP_COPIES.md for restart flags and evidence scope.
