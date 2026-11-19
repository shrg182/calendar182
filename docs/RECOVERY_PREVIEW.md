# Read-only recovery comparison

This prototype compares one verified Calendar sync SQLite snapshot with one
Calendar182 version 1 browser JSON export. It prints a JSON review report;
it does not merge, import, reset cursors, activate a restored service or change
input files. No live-device exports are collected automatically.

From the repository root:

```sh
python3 -B prototype/sync/recovery_preview.py \
  --snapshot /private/path/snapshot.sqlite3 \
  --device-export /private/path/device-backup.json \
  --account account-a
```

Use a snapshot made by the backup tool or the snapshot.sqlite3 from a separately
verified destination bundle. Verify a copied bundle with the existing verify-copy
command before using its database. Preserve the original exports and separately
copy unsaved drafts. Run once per device against the same snapshot; this first
version does not combine several device exports. Reports contain dates,
operation IDs and text fingerprints, so keep them private and out of Git.
Full note text, credentials and session contents are not printed.

## Account and evidence limits

Older version 1 exports omit account and service identity. New exports retain
version 1 and add optional provenance (metadata version 1): storage mode, account,
serviceEpoch and cursor, read in the same transaction as notes/history/outbox.
Local-only exports use null identity fields; an unbound computer database has a
known account but null serviceEpoch/cursor. No credentials are exported.

The preview rejects a computer export whose account label differs from --account.
It reports serviceIdentityStatus as matches, different_review_required, or
unknown. Different identity is expected after a restore; it is not permission to
rebind or replay. Missing/malformed metadata is distinguished: absent metadata
remains readable as unknown; explicitly malformed metadata is rejected.

Labels are self-reported and editable: accountBindingVerified stays false even
when accountLabelMatches is true. Check where the export came from. Server reads are filtered to that account; another
account's notes are never included in the report. Device timestamps are not used
to choose a winner. Missing history or a stale export cannot establish that a
server-only record is a newly created note.

## Operation classifications

- accepted: matching ID and payload exist in the snapshot.
- accepted_pending_ack: an exported pending operation is already in the snapshot;
  it may represent a lost acknowledgement. The tool does not clear it.
- pending_absent_from_snapshot: pending saved edit not found in this snapshot.
- local_only_unclassified: non-pending operation absent from the snapshot. It
  could be a later acknowledged write, ordinary local data, or imported history.
- id_content_conflict: the same ID has different content; investigate before any
  recovery action. Never replay it as though it were a safe retry.

Current-note comparisons independently identify same content, device-only,
server-only and differing content requiring review. Tombstones remain explicit;
absence is never converted into deletion. Identical content with different IDs
is not evidence that the device's operation was acknowledged.

## Validation

Seven synthetic-data tests cover pending and accepted operations, ambiguous
missing history, ID collisions, tombstones, per-account filtering, invalid
exports, duplicate records and exact input-byte preservation. The tool limits
exports to 25 MiB and each collection to 100,000 records, validates payloads and
rejects conflicting local IDs. SQLite integrity and current/history consistency
are checked in a read transaction. Inputs must be trusted local recovery files;
this is not a public upload service.

## Reviewed choices

Explicit date-level choices are available through the [recovery-choice workflow](RECOVERY_CHOICES.md). It validates selections against a fingerprint of the comparison inputs and produces a non-executable review record. No automatic reconciliation or production cutover is authorized by either report.
