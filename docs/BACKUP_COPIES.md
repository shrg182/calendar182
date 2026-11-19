# Copies to an owner-selected backup destination

Status: workflow implemented and tested with temporary folders; no real destination is selected or enabled yet. No project snapshot has been copied to OneDrive, an external drive or another external folder.

Inspection found `/Users/ruixingshi/OneDrive` and no mounted external drive under `/Volumes` (only the internal system volume and Time Machine's managed directory). Neither a Time Machine internal directory nor a detected cloud folder is selected automatically. Owner choice is required before exporting readable note data.

## Workflow

Choose an existing destination root. The tool creates only its own `Calendar182Backups` subfolder there. Each snapshot gets a separate bundle directory containing:

- `snapshot.sqlite3`: verified accepted history/current records; sign-in sessions removed by local snapshot creation.
- `manifest.json`: format, SHA-256 checksum and operation/record counts. No token, key, credentials file or source filesystem path is included.

The original local snapshot is retained. A new bundle is copied into a private temporary directory, flushed, checked byte-for-byte by SHA-256 and validated as a consistent Calendar SQLite snapshot before the directory is published. An existing identical bundle is reused. Conflicting/corrupted bundles are refused rather than overwritten. Only the current attempt's temporary files are cleaned up on failure.

Missing destination roots are never created, so an absent/unmounted folder does not cause a new fallback directory to be created under `/Volumes`. Confirm the intended external volume is actually mounted; an existing same-named local folder alone is not proof of an external device. No destination copies are automatically pruned in this first version; local 168-snapshot retention remains separate. Storage use at the chosen destination can grow and needs its own owner-selected retention policy.

Files are unencrypted readable SQLite data. Owner-only permissions are requested, but external/cloud filesystem access rules still apply. Selecting a cloud-synced folder authorizes local export there; filesystem verification cannot prove the cloud desktop application uploaded it or that a remote copy is recoverable. Do not claim off-computer protection until the external medium/cloud copy is independently verified.

## Commands after destination selection

```sh
python3 prototype/sync/backups.py copy --snapshot PATH_TO_VERIFIED_LOCAL_SNAPSHOT --root EXISTING_SELECTED_ROOT
python3 prototype/sync/backups.py verify-copy --bundle PATH_TO_RETURNED_BUNDLE
python3 prototype/sync/backups.py restore --snapshot PATH_TO_RETURNED_BUNDLE --destination NEW_UNUSED_RESTORE_DIRECTORY
```

A bundle restore verifies its manifest/checksum before creating the new directory, then applies the existing restore safeguards: no live overwrite, new service epoch, cleared sessions and retained operation identities/history/tombstones. The original live service stays untouched.

For periodic copying, add `--backup-copy-root EXISTING_SELECTED_ROOT` to the existing server command. It retries the latest local snapshot on each scheduler check, including after a disconnected destination returns. Local snapshots continue if copying fails. HTTP/HTTPS workers use a destination copy lock to avoid duplicate work. Default is disabled; no copying occurs without this explicit option. The service must remain running; no OS startup task or new cloud service is installed.

## Verification

Five new tests passed: verified/idempotent copy and restore, missing-root/live-file refusal, corrupted-manifest rejection without overwrite/restore, failed-copy preservation and cleanup, and local scheduler survival/catch-up after destination return. All 21 Python service/backup/copy tests and lint/whitespace checks passed. Tests use synthetic notes and temporary folders; these are not actual external-drive/cloud-upload observations.

Next: receive the owner's choice, verify the concrete destination, copy one retained-data snapshot there with required filesystem permission, verify/checksum it, and restore from that copy into a new private drill directory. For a cloud folder, separately confirm remote sync status before claiming off-computer recovery.
