"""Validate one combined multi-device recovery review; never apply or rebind."""
import argparse
import json
from pathlib import Path
import sqlite3
from recovery_multi import compare_devices
from recovery_plan import fingerprint


def operation_requirements(report):
    conflicts = {row['operationId'] for row in report['crossDeviceOperationConflicts']}
    actions = {'accepted_pending_ack': 'preserve_acknowledgement_evidence',
               'pending_absent_from_snapshot': 'preserve_pending_edit',
               'local_only_unclassified': 'preserve_unclassified_history',
               'id_content_conflict': 'quarantine_conflicting_versions'}
    requirements = []
    for label, device in sorted(report['devices'].items()):
        for row in device['operations']:
            collision = row['operationId'] in conflicts or row['status'] == 'id_content_conflict'
            if row['status'] == 'accepted' and not collision:
                continue
            requirements.append({'device': label, **row,
                                 'requiredDisposition': 'quarantine_conflicting_versions' if collision else actions[row['status']]})
    return sorted(requirements, key=lambda row: (row['device'], row['operationId']))


def review_operations(report, entries):
    requirements = {(row['device'], row['operationId']): row for row in operation_requirements(report)}
    if not isinstance(entries, list):
        raise ValueError('Operation review list required; regenerate the template')
    seen, reviews = set(), []
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError('Invalid operation review')
        device, oid, action = entry.get('device'), entry.get('operationId'), entry.get('disposition')
        if not isinstance(device, str) or not isinstance(oid, str):
            raise ValueError('Operation review needs device and ID')
        key = (device, oid)
        if key not in requirements or key in seen:
            raise ValueError('Unknown or duplicate operation review')
        seen.add(key)
        required = requirements[key]
        if action not in ('defer', required['requiredDisposition']):
            raise ValueError('Disposition does not preserve this operation category')
        reviews.append({**required, 'disposition': action, 'preservationPerformed': False})
    if seen != set(requirements):
        raise ValueError('Every operation concern needs an explicit review, including defer')
    return sorted(reviews, key=lambda row: (row['device'], row['operationId']))


def template(report):
    return {'format': 'calendar182-multi-recovery-choices-v2', 'account': report['account'],
            'comparisonSha256': fingerprint(report),
            'choices': [{'date': row['date'], 'choice': 'defer', 'source': None,
                         'confirmDeletion': False}
                        for row in report['dates'] if row['status'] != 'same_content'],
            'operationReviews': [{'device': row['device'], 'operationId': row['operationId'],
                                  'disposition': 'defer'} for row in operation_requirements(report)]}


def plan(report, decisions):
    expected = template(report)
    if not isinstance(decisions, dict) or decisions.get('format') != expected['format'] or decisions.get('account') != expected['account']:
        raise ValueError('Wrong choice format or account')
    if decisions.get('comparisonSha256') != expected['comparisonSha256']:
        raise ValueError('One or more inputs changed; review new choices')
    choices = decisions.get('choices')
    if not isinstance(choices, list):
        raise ValueError('Missing choices')
    required = {row['date']: row for row in report['dates'] if row['status'] != 'same_content'}
    seen, outcomes = set(), []
    for item in choices:
        if not isinstance(item, dict):
            raise ValueError('Invalid choice')
        date, action, source = item.get('date'), item.get('choice'), item.get('source')
        if not isinstance(date, str) or date not in required or date in seen:
            raise ValueError('Unknown or repeated date')
        seen.add(date)
        if type(item.get('confirmDeletion')) is not bool:
            raise ValueError('Deletion confirmation must be boolean')
        if action == 'defer':
            if source is not None or item['confirmDeletion']:
                raise ValueError('Deferred choices cannot select a source or deletion')
            outcomes.append({'date': date, 'choice': 'defer', 'effect': 'unresolved'})
            continue
        if action != 'select' or not isinstance(source, str) or source not in required[date]['candidates']:
            raise ValueError('Choose select with an exact source label, or defer')
        selected = required[date]['candidates'][source]
        if selected is None:
            raise ValueError('Absent records are not selectable deletions')
        if selected['deleted'] != item['confirmDeletion']:
            raise ValueError('Deleted candidates require explicit deletion confirmation')
        outcomes.append({'date': date, 'choice': 'select', 'source': source,
                         'selected': dict(selected),
                         'effect': 'select_deleted_state' if selected['deleted'] else 'select_saved_content'})
    if seen != set(required):
        raise ValueError('All differing or partially absent dates need a choice')
    concerns = operation_requirements(report)
    reviews = review_operations(report, decisions.get('operationReviews'))
    return {'format': 'calendar182-multi-recovery-plan-v2', 'account': report['account'],
            'comparisonSha256': expected['comparisonSha256'], 'readOnly': True, 'executable': False,
            'choicesComplete': all(item['choice'] != 'defer' for item in outcomes),
            'decisions': sorted(outcomes, key=lambda item: item['date']),
            'unresolvedOperations': concerns,
            'operationReviews': reviews,
            'operationReviewComplete': all(row['disposition'] != 'defer' for row in reviews),
            'preservationPerformed': False,
            'crossDeviceOperationConflicts': report['crossDeviceOperationConflicts'],
            'accountBindingVerified': False,
            'serviceIdentityByDevice': {label: device['serviceIdentityStatus']
                                        for label, device in report['devices'].items()},
            'warnings': ['All candidates and unselected histories must remain preserved in their original inputs.',
                         'Complete current-note choices do not resolve pending edits, lost acknowledgements or conflicting operation IDs.',
                         'Matching current contents may still conceal operation/history conflicts listed in this report.',
                         'Preservation dispositions are intentions, not proof of archival or conflict resolution. All operation concerns remain listed.',
                         'This plan is not executable. No replay, outbox clearing, identity rebinding or live cutover is performed.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', required=True, type=Path)
    parser.add_argument('--account', required=True, choices=['account-a', 'account-b'])
    parser.add_argument('--device', action='append', nargs=2, required=True, metavar=('LABEL', 'EXPORT'))
    parser.add_argument('--choices', type=Path, help='Omit to print a defer-by-default template')
    args = parser.parse_args()
    try:
        exports = dict(args.device)
        if len(exports) != len(args.device):
            raise ValueError('Repeated device label')
        report = compare_devices(args.snapshot, exports, args.account)
        result = template(report)
        if args.choices:
            with args.choices.open('rb') as source:
                raw = source.read(25 * 1024 * 1024 + 1)
            if len(raw) > 25 * 1024 * 1024:
                raise ValueError('Oversized choices')
            result = plan(report, json.loads(raw))
    except (ValueError, TypeError, KeyError, OSError, sqlite3.Error):
        parser.exit(2, 'Cannot plan: invalid or changed inputs/choices. Generate a new template and review all devices. No data changed.\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
