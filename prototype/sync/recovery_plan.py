"""Prepare or validate explicit recovery choices; never execute a recovery plan."""
import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
from recovery_preview import compare


def fingerprint(report):
    return hashlib.sha256(json.dumps(report, sort_keys=True, ensure_ascii=False,
                                     separators=(',', ':')).encode()).hexdigest()


def template(report):
    return {'format': 'calendar182-recovery-choices-v1', 'account': report['account'],
            'comparisonSha256': fingerprint(report),
            'choices': [{'date': row['date'], 'choice': 'defer', 'confirmDeletion': False}
                        for row in report['dates'] if row['status'] != 'same_content']}


def plan(report, decisions):
    expected = template(report)
    if not isinstance(decisions, dict) or decisions.get('format') != expected['format'] or decisions.get('account') != report['account']:
        raise ValueError('Invalid choices format or account')
    if decisions.get('comparisonSha256') != expected['comparisonSha256']:
        raise ValueError('Comparison changed; generate and review new choices')
    choices = decisions.get('choices')
    if not isinstance(choices, list):
        raise ValueError('Choices must be a list')
    required = {row['date']: row for row in report['dates'] if row['status'] != 'same_content'}
    seen, outcomes = set(), []
    for choice in choices:
        if not isinstance(choice, dict):
            raise ValueError('Invalid choice')
        date, action = choice.get('date'), choice.get('choice')
        if not isinstance(date, str) or date not in required or date in seen:
            raise ValueError('Unknown or repeated date')
        seen.add(date)
        if action not in ('keep_server', 'use_device', 'defer') or type(choice.get('confirmDeletion')) is not bool:
            raise ValueError('Invalid action or deletion confirmation')
        row = required[date]
        if action == 'defer':
            if choice['confirmDeletion']:
                raise ValueError('Deferred choice cannot confirm deletion')
            outcomes.append({'date': date, 'choice': action, 'effect': 'unresolved'})
            continue
        selected = row['server' if action == 'keep_server' else 'device']
        if selected is None:
            raise ValueError('Absent record is not a selectable deletion')
        if selected['deleted'] != choice['confirmDeletion']:
            raise ValueError('Selecting a tombstone requires explicit deletion confirmation')
        outcomes.append({'date': date, 'choice': action, 'selected': selected,
                         'effect': 'select_deleted_state' if selected['deleted'] else 'select_saved_content'})
    if seen != set(required):
        raise ValueError('Every differing date needs a choice, including defer')
    concerns = [dict(row) for row in report['operations'] if row['status'] != 'accepted']
    return {'format': 'calendar182-recovery-plan-v1', 'account': report['account'],
            'comparisonSha256': expected['comparisonSha256'], 'readOnly': True, 'executable': False,
            'choicesComplete': all(row['choice'] != 'defer' for row in outcomes),
            'decisions': sorted(outcomes, key=lambda row: row['date']),
            'unresolvedOperations': concerns,
            'serviceIdentityStatus': report['serviceIdentityStatus'],
            'accountBindingVerified': False,
            'warnings': ['This is a review record, not an executable merge or permission to replay queued edits.',
                         'Keep both source files and every device export. Choosing content does not discard pending operations or history.',
                         'Pending acknowledgements, missing history and ID conflicts need separate review, even when all dates have choices.',
                         'Account provenance is self-reported. Service rebinding and production cutover are not implemented.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', required=True, type=Path)
    parser.add_argument('--device-export', required=True, type=Path)
    parser.add_argument('--account', required=True, choices=['account-a', 'account-b'])
    parser.add_argument('--choices', type=Path, help='Omit to print a template; supply reviewed JSON to validate it')
    args = parser.parse_args()
    try:
        report = compare(args.snapshot, args.device_export, args.account)
        result = template(report)
        if args.choices:
            with args.choices.open('rb') as source:
                raw = source.read(25 * 1024 * 1024 + 1)
            if len(raw) > 25 * 1024 * 1024:
                raise ValueError('Choices exceed size limit')
            result = plan(report, json.loads(raw))
    except (ValueError, TypeError, KeyError, OSError, sqlite3.Error):
        parser.exit(2, 'Cannot plan: inputs or choices invalid or changed. Regenerate and review the template. No data changed.\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
