# Multi-device recovery comparison

Use this read-only tool to compare two to eight Calendar182 exports against one
SQLite snapshot. It accepts operator-chosen device labels; it does not connect
to the devices, collect exports, select winning edits or change any notes.

```sh
python3 -B prototype/sync/recovery_multi.py \
  --snapshot /private/path/snapshot.sqlite3 --account account-a \
  --device imac /private/path/imac-backup.json \
  --device ipad /private/path/ipad-backup.json
```

The snapshot is frozen once using SQLite's backup API into a private temporary
folder. Each export is captured once (maximum 25 MiB per file). The existing
single-device comparison validates the captured inputs. Temporary files are
removed after comparison. Original files are unchanged; reports go to stdout.
Use separately verified backup bundles and preserve all source exports/drafts.
Do not store real exports or reports in Git.

Labels must be unique short ASCII letters/digits/underscore/hyphen strings;
`server` is reserved. Reusing one resolved file path for multiple labels is
rejected. Labels are not device authentication. Older exports still have unknown
provenance; explicit mismatched account labels are rejected. Different service
identities remain visible per device, not silently rebound.

## Report

- `devices`: complete single-device reports, including per-device pending edits,
  ambiguous missing history and account/service checks.
- `dates`: candidates from server and every device, with note-text fingerprints,
  operation IDs and deletion flags. No full note text is printed.
- `same_content`: all candidates present and equal in content/deletion state.
  Different IDs or pending operations still need review.
- `matching_present_records_with_absences`: present candidates agree, but one or
  more sources lack that date. Absence is not a deletion or evidence of age.
- `different_content_review_required`: conflicting current content/deletion.
- `crossDeviceOperationConflicts`: same operation ID with different payloads,
  including retained history even when current text matches.
- `comparisonInputSha256`: binds every device's underlying comparison, including
  account/service identity, history and pending IDs. Argument ordering does not
  change it. Modified history does. This is not a signature or authorization.

Reports contain private dates, identifiers and content fingerprints. Keep them
private. No timestamps choose a winner; no export is assumed most recent merely
because it was loaded last. `executable` is always false.

## Validation and limits

Six synthetic tests cover divergent edits, deletion markers, equal text with
separate IDs, missing records, historical ID collisions, stable fingerprints,
wrong-account and label/input rejection, legacy provenance, changed identity,
account filtering and byte-for-byte source preservation. The combined recovery
suite has 20 passing tests.

A [combined choice validator](MULTI_DEVICE_CHOICES.md) is now available through
recovery_multi_plan.py. It remains non-executable. The earlier recovery_plan.py
is single-device only; do not apply separate plans sequentially. Per-operation
reconciliation and preservation of all histories still require explicit design
before generalized isolated materialization or live cutover.
