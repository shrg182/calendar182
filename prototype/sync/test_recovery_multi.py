import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from backups import backup
from server import Store
from recovery_multi import compare_devices


def note(n, text, date='2026-11-19', deleted=False):
    return {'operationId': f'multi-operation-{n:08d}', 'date': date, 'text': text, 'deleted': deleted}


class MultiPreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'source.sqlite3')
        self.store.write('account-a', {'id': 'server-operation-0001', 'date': '2026-11-19', 'text': 'server', 'deleted': False})
        self.store.write('account-b', {'id': 'private-operation-0001', 'date': '2026-11-20', 'text': 'other-account-private', 'deleted': False})
        self.snapshot = backup(self.root / 'source.sqlite3', self.root / 'snapshots')

    def tearDown(self):
        self.temp.cleanup()

    def export(self, label, notes, history=(), pending=(), account='account-a'):
        path = self.root / f'{label}.json'
        path.write_text(json.dumps({'app': 'calendar182', 'version': 1, 'notes': notes,
                                   'history': list(history), 'outbox': list(pending),
                                   'provenance': {'version': 1, 'storage': 'computer', 'account': account,
                                                  'serviceEpoch': self.store.epoch, 'cursor': 0}}))
        return path

    def test_divergence_deletion_account_filter_and_unchanged_sources(self):
        imac = self.export('imac', [note(1, 'imac secret')], pending=[note(1, 'imac secret')])
        ipad = self.export('ipad', [note(2, '', deleted=True)])
        sources = [self.snapshot, imac, ipad]
        before = [hashlib.sha256(p.read_bytes()).hexdigest() for p in sources]
        report = compare_devices(self.snapshot, {'imac': imac, 'ipad': ipad}, 'account-a')
        self.assertEqual(report['dates'][0]['status'], 'different_content_review_required')
        self.assertTrue(report['dates'][0]['candidates']['ipad']['deleted'])
        self.assertFalse(report['executable'])
        self.assertEqual(len(report['dates']), 1)
        for secret in ('imac secret', 'other-account-private', 'private-operation-0001'):
            self.assertNotIn(secret, json.dumps(report))
        self.assertEqual(before, [hashlib.sha256(p.read_bytes()).hexdigest() for p in sources])

    def test_same_content_distinct_ids_and_absence_not_deletion(self):
        imac = self.export('imac', [note(1, 'server'), note(3, 'only here', '2026-11-21')])
        ipad = self.export('ipad', [note(2, 'server')])
        report = compare_devices(self.snapshot, {'imac': imac, 'ipad': ipad}, 'account-a')
        self.assertEqual(report['dates'][0]['status'], 'same_content')
        self.assertEqual(report['dates'][1]['status'], 'matching_present_records_with_absences')
        self.assertEqual(report['dates'][1]['absentFrom'], ['server', 'ipad'])
        self.assertIsNone(report['dates'][1]['candidates']['ipad'])
        self.assertEqual(report['devices']['imac']['operations'][0]['status'], 'local_only_unclassified')

    def test_history_id_collisions_are_visible_even_with_matching_current_text(self):
        imac = self.export('imac', [note(1, 'server')], history=[note(9, 'first history')])
        ipad = self.export('ipad', [note(2, 'server')], history=[note(9, 'different history')])
        report = compare_devices(self.snapshot, {'imac': imac, 'ipad': ipad}, 'account-a')
        self.assertEqual(report['dates'][0]['status'], 'same_content')
        self.assertEqual(len(report['crossDeviceOperationConflicts']), 1)
        self.assertEqual(report['crossDeviceOperationConflicts'][0]['operationId'], note(9, '')['operationId'])

    def test_digest_order_independent_and_tracks_history_changes(self):
        imac = self.export('imac', [note(1, 'server')])
        ipad = self.export('ipad', [note(2, 'server')], history=[note(9, 'first')])
        a = compare_devices(self.snapshot, {'imac': imac, 'ipad': ipad}, 'account-a')
        b = compare_devices(self.snapshot, {'ipad': ipad, 'imac': imac}, 'account-a')
        self.assertEqual(a, b)
        self.export('ipad', [note(2, 'server')], history=[note(9, 'changed')])
        c = compare_devices(self.snapshot, {'imac': imac, 'ipad': ipad}, 'account-a')
        self.assertNotEqual(a['comparisonInputSha256'], c['comparisonInputSha256'])

    def test_wrong_account_bad_labels_duplicate_sources_and_limits_rejected(self):
        imac = self.export('imac', [])
        ipad = self.export('ipad', [], account='account-b')
        with self.assertRaises(ValueError):
            compare_devices(self.snapshot, {'imac': imac, 'ipad': ipad}, 'account-a')
        for exports in ({'imac': imac}, {'imac': imac, 'ipad': imac},
                        {'server': imac, 'ipad': ipad}, {'../unsafe': imac, 'ipad': ipad},
                        {str(i): imac for i in range(9)}):
            with self.subTest(exports=exports), self.assertRaises(ValueError):
                compare_devices(self.snapshot, exports, 'account-a')

    def test_legacy_and_different_service_remain_explicit(self):
        imac = self.export('imac', [])
        ipad = self.export('ipad', [])
        value = json.loads(imac.read_text()); value.pop('provenance'); imac.write_text(json.dumps(value))
        value = json.loads(ipad.read_text()); value['provenance']['serviceEpoch'] = 'prior-service'; ipad.write_text(json.dumps(value))
        report = compare_devices(self.snapshot, {'imac': imac, 'ipad': ipad}, 'account-a')
        self.assertEqual(report['devices']['imac']['serviceIdentityStatus'], 'unknown')
        self.assertEqual(report['devices']['ipad']['serviceIdentityStatus'], 'different_review_required')
        self.assertFalse(report['accountBindingVerified'])


if __name__ == '__main__':
    unittest.main()
