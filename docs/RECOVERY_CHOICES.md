# Recovery choices: review record only

`prototype/sync/recovery_plan.py` adds explicit date-level choices to the
read-only comparison. It has no apply, merge, upload, cursor-reset or service
activation command. All output goes to stdout. Save reports only in a private
location; dates, operation IDs and fingerprints are still private metadata.

## Workflow

1. Preserve all source snapshots, device exports and separately copied drafts.
   Confirm account provenance using RECOVERY_PREVIEW.md. Use a verified snapshot,
   not an actively changing live database.
2. Generate a template (redirect stdout to a private JSON file if desired):

   ```sh
   python3 -B prototype/sync/recovery_plan.py \
     --snapshot /private/path/snapshot.sqlite3 \
     --device-export /private/path/device-backup.json --account account-a
   ```

3. Inspect the original note text privately in the source files. The report only
   contains fingerprints; it is not a substitute for reading both versions.
   Edit each template entry's `choice`, retaining its date and comparison hash:

   - `keep_server`: select the snapshot's current saved record.
   - `use_device`: select the export's current saved record.
   - `defer`: leave the date unresolved. This is every template's default.

   Selecting a deleted record also requires `confirmDeletion: true`. A missing
   record is not a tombstone and cannot be selected. Selecting a nondeleted
   record or deferring requires `confirmDeletion: false`. “Keep server” does
   not mean that device-only data or queued edits can now be discarded.

4. Validate the edited template against the same original inputs:

   ```sh
   python3 -B prototype/sync/recovery_plan.py \
     --snapshot /private/path/snapshot.sqlite3 \
     --device-export /private/path/device-backup.json --account account-a \
     --choices /private/path/reviewed-choices.json
   ```

Every differing date needs one choice, including defer. Same-content dates need
no choice. Unknown/duplicate dates and account/hash mismatches are rejected.
The comparison hash binds selected-account server history, service identity,
device versions/current records/pending IDs and provenance. It covers non-current
history content too. A changed input requires a new template and review. This
hash detects stale comparisons; it is not a digital signature or authorization.

## Understanding the plan

`choicesComplete` only means no differing date remains deferred. It does not
mean safe to execute. `executable` is always false. `unresolvedOperations` retains
pending acknowledgements, pending missing edits, ambiguous absent history and ID
collisions even after current-note choices are complete. No outbox entry or
retained version is dropped, acknowledged or replayed by this tool.

A future apply workflow must separately resolve these operations, review all
devices, preserve conflicting histories, validate account/service identity,
create a new isolated recovery result, and test reconciliation before live
cutover. Neither a complete choices file nor a successful validation authorizes
a destructive merge or rebind.

## Validation

Six plan tests plus seven comparison tests pass with synthetic data. Cases cover
safe defaults, selected deletion confirmation, absent-record rejection, malformed
choices, account mismatch, stale history/service identity, and byte-for-byte
preservation of inputs. No live notes, credentials or services were used.
