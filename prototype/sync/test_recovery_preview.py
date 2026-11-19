import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from server import Store
from backups import backup
from recovery_preview import compare


def note(number, text='saved', date='2026-11-19', deleted=False):
    return {'operationId': f'preview-operation-{number:08d}', 'date': date, 'text': text,
            'deleted': deleted, 'createdAt': '2026-11-19T00:00:00Z', 'updatedAt': '2026-11-19T00:00:00Z'}


class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'source.sqlite3')
        self.export = self.root / 'device.json'

    def tearDown(self):
        self.temp.cleanup()

    def accept(self, item, account='account-a'):
        self.store.write(account, {'id': item['operationId'], **{k: item[k] for k in ('date', 'text', 'deleted')}})

    def preview(self, notes, history=(), outbox=(), extra=None):
        self.export.write_text(json.dumps({'app': 'calendar182', 'version': 1, 'notes': notes,
                                         'history': list(history), 'outbox': list(outbox), **(extra or {})}))
        snapshot = backup(self.root / 'source.sqlite3', self.root / 'backups')
        before = [hashlib.sha256(p.read_bytes()).hexdigest() for p in (snapshot, self.export)]
        result = compare(snapshot, self.export, 'account-a')
        self.assertEqual(before, [hashlib.sha256(p.read_bytes()).hexdigest() for p in (snapshot, self.export)])
        return result

    def test_pending_ack_missing_history_conflicts_and_account_isolation(self):
        old = note(1)
        self.accept(old)
        self.accept(note(90, 'PRIVATE OTHER ACCOUNT', date='2026-11-20'), 'account-b')
        pending = note(2, 'pending edit')
        absent = note(3, 'missing history')
        result = self.preview([pending], [old, absent], [old, pending])
        statuses = {item['operationId']: item['status'] for item in result['operations']}
        self.assertEqual(statuses[old['operationId']], 'accepted_pending_ack')
        self.assertEqual(statuses[pending['operationId']], 'pending_absent_from_snapshot')
        self.assertEqual(statuses[absent['operationId']], 'local_only_unclassified')
        self.assertEqual(result['dates'][0]['status'], 'different_content_review_required')
        self.assertEqual(result['counts']['serverOperations'], 1)
        self.assertFalse(result['accountBindingVerified'])
        serialized = json.dumps(result)
        for secret in ('PRIVATE OTHER ACCOUNT', 'pending edit', 'missing history', '2026-11-20'):
            self.assertNotIn(secret, serialized)

    def test_tombstones_server_only_and_identical_content(self):
        deleted = note(1, '', deleted=True)
        self.accept(deleted)
        self.accept(note(2, date='2026-11-20'))
        result = self.preview([deleted, note(3, date='2026-11-21')])
        self.assertEqual([row['status'] for row in result['dates']], ['same_content', 'server_only', 'device_only'])
        self.assertTrue(result['dates'][0]['server']['deleted'])
        self.assertEqual(result['operations'][0]['status'], 'accepted')

    def test_reused_server_id_is_never_silently_accepted(self):
        self.accept(note(1, 'server'))
        result = self.preview([note(1, 'device')])
        self.assertEqual(result['operations'][0]['status'], 'id_content_conflict')

    def test_invalid_exports_and_conflicting_local_ids_rejected(self):
        for bad in [note(1, date='2026-02-30'), note(1, '', deleted=False), note(1, 'text', deleted=True)]:
            with self.assertRaises(ValueError):
                self.preview([bad])
        with self.assertRaises(ValueError):
            self.preview([note(1)], [note(1, 'conflicting')])
        with self.assertRaises(ValueError):
            self.preview([note(1), note(2)])
        with self.assertRaises(ValueError):
            self.preview([note(1)], outbox=[note(1), note(1)])

    def test_provenance_matches_unknown_and_rotated_identity(self):
        base = {'version': 1, 'storage': 'computer', 'account': 'account-a',
                'serviceEpoch': self.store.epoch, 'cursor': 0}
        report = self.preview([], extra={'provenance': {**base, 'token': 'DO-NOT-PRINT'}})
        self.assertNotIn('DO-NOT-PRINT', json.dumps(report))
        self.assertTrue(report['accountLabelMatches'])
        self.assertFalse(report['accountBindingVerified'])
        self.assertEqual(report['serviceIdentityStatus'], 'matches')
        report = self.preview([], extra={'provenance': {**base, 'serviceEpoch': 'old-service'}})
        self.assertEqual(report['serviceIdentityStatus'], 'different_review_required')
        report = self.preview([], extra={'provenance': {**base, 'serviceEpoch': None, 'cursor': None}})
        self.assertEqual(report['serviceIdentityStatus'], 'unknown')
        self.assertEqual(self.preview([])['serviceIdentityStatus'], 'unknown')
        report = self.preview([], extra={'provenance': {'version': 1, 'storage': 'local',
                             'account': None, 'serviceEpoch': None, 'cursor': None}})
        self.assertFalse(report['accountLabelMatches'])

    def test_provenance_rejects_wrong_account_and_malformed_metadata(self):
        base = {'version': 1, 'storage': 'computer', 'account': 'account-a',
                'serviceEpoch': self.store.epoch, 'cursor': 0}
        for bad in [None, {}, {**base, 'account': 'account-b'}, {**base, 'cursor': True},
                    {**base, 'cursor': -1}, {**base, 'cursor': None},
                    {**base, 'version': True}, {**base, 'storage': 'local'},
                    {**base, 'serviceEpoch': ''}]:
            with self.subTest(metadata=bad), self.assertRaises(ValueError):
                self.preview([], extra={'provenance': bad})

    def test_invalid_database_export_shape_and_account_rejected(self):
        self.export.write_text('{}')
        with self.assertRaises(ValueError):
            compare(self.root / 'source.sqlite3', self.export, 'account-a')
        with self.assertRaises(ValueError):
            compare(self.root / 'source.sqlite3', self.export, 'unknown')


if __name__ == '__main__':
    unittest.main()
