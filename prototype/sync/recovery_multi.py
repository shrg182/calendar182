"""Compare two to eight device exports against one frozen snapshot; no merging."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import tempfile
from backups import copy_database
from recovery_preview import compare, load_export, payload


def compare_devices(snapshot, exports, account):
    if not isinstance(exports, dict) or not 2 <= len(exports) <= 8:
        raise ValueError('Choose two to eight uniquely labeled exports')
    if any(not isinstance(label, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,32}', label) or label == 'server' for label in exports):
        raise ValueError('Use short unique labels; server is reserved')
    paths = [Path(path).resolve() for path in exports.values()]
    if len(set(paths)) != len(paths):
        raise ValueError('The same export file cannot represent multiple devices')
    reports, versions_by_id, currents = {}, {}, {}
    # Freeze once, avoiding a different server view for each device. Session data
    # is removed by the existing snapshot copier; source files are never written.
    with tempfile.TemporaryDirectory(prefix='calendar-multi-review-') as temporary:
        root = Path(temporary)
        frozen = root / 'snapshot.sqlite3'
        copy_database(snapshot, frozen)
        frozen.chmod(0o600)
        for label in sorted(exports):
            with open(exports[label], 'rb') as source:
                raw = source.read(25 * 1024 * 1024 + 1)
            if len(raw) > 25 * 1024 * 1024:
                raise ValueError('Device export exceeds size limit')
            captured = root / f'{label}.json'
            with captured.open('xb') as target:
                captured.chmod(0o600)
                target.write(raw)
            reports[label] = compare(frozen, captured, account)
            versions, pending, current, _ = load_export(captured)
            currents[label] = {row['date']: row['device'] for row in reports[label]['dates'] if row['device'] is not None}
            for oid, record in versions.items():
                versions_by_id.setdefault(oid, []).append((label, payload(record), oid in pending))
    first = reports[next(iter(reports))]
    server = {row['date']: row['server'] for row in first['dates'] if row['server'] is not None}
    all_dates = set(server)
    for current in currents.values():
        all_dates.update(current)
    dates = []
    for date in sorted(all_dates):
        candidates = {'server': server.get(date), **{label: currents[label].get(date) for label in reports}}
        signatures = {(row['deleted'], row['textSha256']) for row in candidates.values() if row is not None}
        missing = [label for label, row in candidates.items() if row is None]
        status = 'different_content_review_required' if len(signatures) > 1 else (
            'matching_present_records_with_absences' if missing else 'same_content')
        dates.append({'date': date, 'status': status, 'absentFrom': missing, 'candidates': candidates})
    conflicts = []
    for oid, observations in sorted(versions_by_id.items()):
        if len({row[1] for row in observations}) > 1:
            conflicts.append({'operationId': oid, 'status': 'cross_device_id_content_conflict',
                              'observations': [{'device': label, 'date': content[0], 'deleted': content[2],
                                                'textSha256': hashlib.sha256(content[1].encode()).hexdigest(),
                                                'pending': pending} for label, content, pending in observations]})
    digests = {label: report['comparisonInputSha256'] for label, report in reports.items()}
    digest = hashlib.sha256(json.dumps(digests, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    return {'format': 'calendar182-multi-recovery-preview-v1', 'account': account,
            'readOnly': True, 'executable': False, 'accountBindingVerified': False,
            'comparisonInputSha256': digest, 'devices': reports, 'dates': dates,
            'crossDeviceOperationConflicts': conflicts,
            'warnings': ['Device labels are operator-supplied, not verified identities.',
                         'Absence is not deletion. Timestamps never select a winner.',
                         'Matching current content does not settle pending operations or conflicting history.',
                         'Keep reports private. No merge, acknowledgement, rebind or live activation is performed.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', required=True, type=Path)
    parser.add_argument('--account', required=True, choices=['account-a', 'account-b'])
    parser.add_argument('--device', action='append', nargs=2, required=True, metavar=('LABEL', 'EXPORT'))
    args = parser.parse_args()
    try:
        exports = dict(args.device)
        if len(exports) != len(args.device):
            raise ValueError('Duplicate device label')
        report = compare_devices(args.snapshot, exports, args.account)
    except (ValueError, TypeError, KeyError, OSError, sqlite3.Error):
        parser.exit(2, 'Cannot compare: invalid snapshot, exports, labels or account. No input data changed.\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
