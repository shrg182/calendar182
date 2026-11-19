# Copies to an owner-selected backup destination

Status (2026-11-19): owner indicated existing iCloud Drive as the preferred destination. Dedicated iCloud folder copying is enabled; a retained-data bundle passed checksum and local restore checks. macOS reports both bundle files uploaded. Independent-device download/restore remains unverified.

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

The preparation above preceded destination selection. The selected iCloud setup and precise verification scope follow.

## Selected iCloud Drive destination — 2026-11-19

Destination: existing iCloud Drive → Calendar182Backups. Root on this Mac is `~/Library/Mobile Documents/com~apple~CloudDocs`. The owner identified iCloud Drive as their usual storage, and the concrete folder copy was approved through filesystem permission. No OneDrive or external-drive copy was made, and no Calendar sync backend was replaced.

A fresh local snapshot of 25 accepted operations/one current record was exported as bundle `calendar182-20261119T161642588269Z-e25adc78`. The source/target checksum and database integrity/counts matched. Restoring from that iCloud-folder bundle into a separate ignored local drill directory verified 25 operations/one record, new epoch and zero sessions; live identity/operation/session counts remained unchanged. This was a local read of the iCloud folder, not an independent device download.

Targeted Foundation metadata reads for `snapshot.sqlite3` and `manifest.json` returned isUbiquitousItem=true, uploaded=true, uploading=false, no upload error and no unresolved conflicts. This is macOS-reported upload completion, not an independent cloud checksum/restore. [Apple upload-status API](https://developer.apple.com/documentation/foundation/urlresourcekey/ubiquitousitemisuploadedkey). No unrelated iCloud documents were inspected.

Both retained staging services were restarted with the existing data/certificate options plus the selected `--backup-copy-root`, and HTTP/CA-verified HTTPS returned 200. They continue hourly local snapshots and retry the latest destination copy on scheduler checks. Destination bundles currently have no automatic pruning; local retention stays at 168. No device trust settings or main/public deployment changed.

For a manual HTTP service restart, include the destination explicitly:

```sh
python3 prototype/sync/server.py --host 0.0.0.0 --allow-host 192.168.68.58 --port 8791 --data-dir prototype/sync/.data/calendar-stage --calendar-dist prototype/sync/calendar-dist --ca-cert prototype/sync/.data/local-https/ca.pem --backup-copy-root "$HOME/Library/Mobile Documents/com~apple~CloudDocs"
```

Do not start a duplicate listener on the same port. The ignored `backup-copy-config.json` records the selected root and verification evidence for handoff; it is not automatically loaded as service configuration. Manual restarts must retain the flag. No OS autostart job is installed.

Next optional independent check: on iPad Files → iCloud Drive → Calendar182Backups, find the bundle and open its manifest. A visible folder alone proves neither a complete database download nor a restore on that device; record those observations precisely.

## iPad folder visibility — 2026-11-19

Asked whether Calendar182Backups was visible in iPad Files under iCloud Drive, owner replied "See it." Record as owner-reported independent-device folder visibility only. Opening the copied manifest/database, checksum verification after remote download and an independent restore remain unconfirmed. Next open the verified bundle ending e25adc78 and manifest.json; expected operations=25 and records=1.

## iPad manifest read confirmed — 2026-11-19

Owner opened the selected bundle manifest on iPad and supplied format calendar182-sync-snapshot-v1, operations 25, records 1, SHA-256 `5469c09d5fe92314c8932b55db26a55bf2c6ef2c1a8f7bf7f24fe91e779c6541`. Recomputed the Mac iCloud-folder database checksum and verified its manifest/database: exact match and counts confirmed. Record as owner-reported independent-device manifest access, with its declared checksum matching the verified local bundle. It does not establish an independent iPad database download/checksum or restore. The earlier local restore drill and OS-reported upload evidence remain separate.
