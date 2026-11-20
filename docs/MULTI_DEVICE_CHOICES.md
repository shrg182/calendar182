# Combined multi-device recovery choices

This is a read-only review tool. It does not merge notes, clear queues, authenticate
an account, rebind a browser, or activate a recovered server. It replaces the idea
of independently applying single-device plans in sequence.

## Generate one template

```sh
python3 -B prototype/sync/recovery_multi_plan.py \
  --snapshot /private/path/snapshot.sqlite3 --account account-a \
  --device imac /private/path/imac.json \
  --device ipad /private/path/ipad.json
```

Save stdout to a private JSON file. Inspect original note text privately in all
source files; the comparison/plan outputs only fingerprints. Every date whose
records differ, or are absent from some sources, gets a default entry:

```json
{"date":"2026-11-19","choice":"defer","source":null,"confirmDeletion":false}
```

To choose a specific existing candidate, change `choice` to `select` and set
`source` to `server` or the exact device label, for example `ipad`. A deleted
candidate requires `confirmDeletion: true`. A nondeleted candidate requires
false. Missing candidates cannot be selected; absence is never a deletion.
Deferred entries must retain null source and false deletion confirmation.

## Validate the reviewed choices

Repeat the same command with `--choices /private/path/reviewed-choices.json`.
The tool recomputes the complete comparison and rejects mismatched account,
format, missing/duplicate/unknown dates, invalid source labels and stale input
fingerprints. All devices are bound to one template: changing any device's
history, pending operations, service metadata, membership or label requires a
new review. Reordering the same --device arguments is harmless.

## Review operations separately (choices format v2)

New templates use `calendar182-multi-recovery-choices-v2` and include
`operationReviews`. Regenerate older v1 templates; do not merely rename their
format. Each concern is identified by both device label and operation ID, so
identical IDs on two devices still receive separate review entries.

Every entry defaults to `disposition: "defer"`. The permitted non-deferred
preservation intention is determined by the comparison evidence:

| Evidence | Permitted disposition |
| --- | --- |
| Pending edit absent from snapshot | `preserve_pending_edit` |
| Pending edit already accepted in snapshot | `preserve_acknowledgement_evidence` |
| Non-pending history absent from snapshot | `preserve_unclassified_history` |
| ID reused with different content, locally versus server or across devices | `quarantine_conflicting_versions` |

Quarantine means the future archive must keep the versions distinct for
investigation; this tool does not move, discard or archive anything. A conflict
overrides other categories, including a copy that individually matches accepted
server history. Acknowledgement evidence does not authorize clearing an outbox.
Unclassified history is not labeled as definitely lost acknowledged data.

All concerns need one entry, including defer. Missing, duplicate and unknown
entries, category-incompatible dispositions, `discard` and `replay` are rejected.
No operation is automatically marked reviewed because a date choice was made.

## Interpret the output

`choicesComplete` describes only date selections. It never means ready to merge.
`operationReviewComplete` means only that every preservation intention is
explicit, not that any conflict has been resolved. `preservationPerformed` and
`executable` are always false. The output retains every device's operation
concerns (including accepted copies implicated in cross-device conflicts) and all cross-device ID/content conflicts, even when
current notes match and there are no date choices. Identity status remains
separate per device, and account provenance remains unverified metadata.

Keep all original exports, unselected versions and separately copied unsaved
drafts. Do not clear an outbox or replay a pending operation based on this plan.
No test tool can infer that absent history was acknowledged after a snapshot.

## Evidence — 2026-11-20

The initial six synthetic tests cover defaults, exact source selection, explicit deletion,
absence, malformed/duplicate/missing choices, mismatched account/format, stale
history/device membership/labels, stable input ordering, retained operation
conflicts, and command-line generation/validation/rejection. Input bytes remain
unchanged. The initial combined-plan checkpoint passed all 26 recovery tests. Six further
operation-review tests now bring the recovery suite to **32 passing tests**.
They cover category-specific preservation, accepted copies of conflicting IDs,
missing/duplicate/unknown reviews, rejected discard/replay actions, independent
date/operation completion and per-device review of shared IDs. No real exports were collected,
no live service restarted and no staged frontend assets were replaced.

Next: create a verified private archive bundle from reviewed inputs in a new
unused destination, before any generalized isolated reconstruction. Verify all
source versions and pending edits remain available; a preservation intention
alone is not evidence that an archive exists. No live replay or cutover.
