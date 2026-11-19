"""Read-only, account-scoped comparison; never merge or activate recovered data."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import sqlite3
from backups import readonly, validate


def payload(record):
    return record['date'], record['text'], record['deleted']


def load_export(path):
    with open(path, 'rb') as source:
        raw = source.read(25 * 1024 * 1024 + 1)
    if len(raw) > 25 * 1024 * 1024:
        raise ValueError('Export exceeds 25 MiB')
    data = json.loads(raw)
    if not isinstance(data, dict) or data.get('app') != 'calendar182' or type(data.get('version')) is not int or data['version'] != 1:
        raise ValueError('Expected Calendar182 version 1 export')
    provenance = data.get('provenance')
    if 'provenance' in data:
        if not isinstance(provenance, dict) or type(provenance.get('version')) is not int or provenance['version'] != 1:
            raise ValueError('Invalid provenance version')
        storage, account, epoch, cursor = (provenance.get(k) for k in ('storage', 'account', 'serviceEpoch', 'cursor'))
        if not {'storage', 'account', 'serviceEpoch', 'cursor'} <= provenance.keys():
            raise ValueError('Incomplete provenance')
        if storage == 'local':
            if any(value is not None for value in (account, epoch, cursor)):
                raise ValueError('Invalid local provenance')
        elif storage == 'computer':
            if account not in ('account-a', 'account-b'):
                raise ValueError('Invalid account label')
            if (epoch is None) != (cursor is None):
                raise ValueError('Incomplete service binding')
            if epoch is not None and (not isinstance(epoch, str) or not 1 <= len(epoch) <= 256 or type(cursor) is not int or not 0 <= cursor <= 9007199254740991):
                raise ValueError('Invalid service binding')
        else:
            raise ValueError('Unknown provenance storage')
        provenance = {'version': 1, 'storage': storage, 'account': account,
                      'serviceEpoch': epoch, 'cursor': cursor}
    versions, pending, current = {}, set(), {}
    for group in ('notes', 'history', 'outbox'):
        rows = data.get(group)
        if not isinstance(rows, list) or len(rows) > 100000:
            raise ValueError('Missing or oversized export collection')
        seen = set()
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError('Invalid exported record')
            date, text, deleted, oid = (row.get(k) for k in ('date', 'text', 'deleted', 'operationId'))
            if not isinstance(date, str) or datetime.date.fromisoformat(date).isoformat() != date or not '1901-01-01' <= date <= '2100-12-31':
                raise ValueError('Invalid record date')
            if not isinstance(text, str) or len(text.encode('utf-16-le')) // 2 > 20000 or type(deleted) is not bool or (deleted and text != '') or (not deleted and not text.strip()):
                raise ValueError('Invalid record payload')
            if not isinstance(oid, str) or not 1 <= len(oid) <= 128 or oid in seen:
                raise ValueError('Invalid or duplicate operation ID')
            seen.add(oid)
            if oid in versions and payload(versions[oid]) != payload(row):
                raise ValueError('Operation ID reused with conflicting content')
            versions[oid] = row
            if group == 'notes':
                if date in current:
                    raise ValueError('Duplicate current date')
                current[date] = row
            if group == 'outbox':
                pending.add(oid)
    return versions, pending, current, provenance


def compare(snapshot, export, account):
    if account not in ('account-a', 'account-b'):
        raise ValueError('Explicit test account-a or account-b required')
    versions, pending, current, provenance = load_export(export)
    if provenance and provenance['storage'] == 'computer' and provenance['account'] != account:
        raise ValueError('Export account label differs from selected account')
    with readonly(snapshot) as db:
        db.execute('BEGIN')  # Consistent read transaction even if accidentally pointed at a live DB.
        validate(db)
        epoch = db.execute("SELECT value FROM meta WHERE key='epoch'").fetchone()[0]
        rows = db.execute('SELECT id,date,text,deleted,revision FROM changes WHERE account=? ORDER BY revision', (account,)).fetchall()
        latest = db.execute('SELECT c.id,c.date,c.text,c.deleted,c.revision FROM current n JOIN changes c USING(revision) WHERE n.account=?', (account,)).fetchall()
    def record(row):
        return dict(zip(('operationId', 'date', 'text', 'deleted', 'revision'), (row[0], row[1], row[2], bool(row[3]), row[4])))
    accepted = {row[0]: record(row) for row in rows}
    server_current = {row[1]: record(row) for row in latest}
    operations = []
    for oid, local in sorted(versions.items()):
        remote = accepted.get(oid)
        status = ('id_content_conflict' if payload(remote) != payload(local) else
                  'accepted_pending_ack' if oid in pending else 'accepted') if remote else (
                  'pending_absent_from_snapshot' if oid in pending else 'local_only_unclassified')
        operations.append({'operationId': oid, 'date': local['date'], 'status': status, 'deleted': local['deleted']})
    dates = []
    def summary(note):
        if note is None:
            return None
        return {'operationId': note['operationId'], 'deleted': note['deleted'],
                'textSha256': hashlib.sha256(note['text'].encode()).hexdigest()}
    for date in sorted(current.keys() | server_current.keys()):
        local, remote = current.get(date), server_current.get(date)
        status = 'server_only' if local is None else 'device_only' if remote is None else (
            'same_content' if payload(local) == payload(remote) else 'different_content_review_required')
        dates.append({'date': date, 'status': status, 'device': summary(local), 'server': summary(remote)})
    # Bind review decisions to all relevant content, including non-current history.
    binding = {'epoch': epoch, 'account': account, 'serverHistory': rows,
               'deviceVersions': {oid: payload(row) for oid, row in versions.items()},
               'deviceCurrent': {date: row['operationId'] for date, row in current.items()},
               'pending': sorted(pending), 'provenance': provenance}
    digest = hashlib.sha256(json.dumps(binding, sort_keys=True, ensure_ascii=False,
                                      separators=(',', ':')).encode()).hexdigest()
    return {'format': 'calendar182-recovery-preview-v1', 'account': account,
            'comparisonInputSha256': digest,
            'accountBindingVerified': False, 'readOnly': True,
            'provenance': provenance,
            'accountLabelMatches': bool(provenance and provenance['storage'] == 'computer'),
            'serviceIdentityStatus': ('unknown' if not provenance or provenance['serviceEpoch'] is None else
                                      'matches' if provenance['serviceEpoch'] == epoch else 'different_review_required'),
            'warnings': ['Provenance labels, when present, are self-reported and not authentication. Confirm the file origin manually. A changed service identity can be expected after restore; never auto-rebind.',
                         'Absent non-pending operations may be local-only or acknowledged after the snapshot; this export cannot distinguish them.',
                         'No winner is selected. Device timestamps are not ordering evidence. Unsaved drafts are not included.',
                         'Report contains dates, identifiers and text fingerprints; keep it private.'],
            'counts': {'deviceOperations': len(versions), 'serverOperations': len(accepted), 'pending': len(pending)},
            'operations': operations, 'dates': dates}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', required=True, type=Path)
    parser.add_argument('--device-export', required=True, type=Path)
    parser.add_argument('--account', required=True, choices=['account-a', 'account-b'])
    args = parser.parse_args()
    try:
        result = compare(args.snapshot, args.device_export, args.account)
    except (ValueError, TypeError, KeyError, OSError, sqlite3.Error):
        parser.exit(2, 'Cannot preview: invalid or unreadable snapshot/export. Inputs were not modified.\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
