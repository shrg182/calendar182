"""Synthetic-only rehearsal; intentionally no production materialization API or CLI."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from backups import backup, restore, readonly, validate
from recovery_preview import compare, load_export
from recovery_plan import template, plan
from server import Store


def op(number, date, text, deleted=False):
    return {'id': f'synthetic-drill-{number:08d}', 'date': date, 'text': text, 'deleted': deleted}


def exported(operation):
    return {'operationId': operation['id'], **{k: operation[k] for k in ('date', 'text', 'deleted')},
            'createdAt': '2026-11-19T00:00:00Z', 'updatedAt': '2026-11-19T00:00:00Z'}


class IsolatedRecoveryDrill(unittest.TestCase):
    def test_selected_contents_history_tombstones_and_sources_preserved(self):
        with tempfile.TemporaryDirectory(prefix='calendar-synthetic-recovery-') as temporary:
            root = Path(temporary)
            source = Store(root / 'source.sqlite3')
            for operation in (op(1, '2026-11-19', 'earlier server'),
                              op(2, '2026-11-19', 'keep server'),
                              op(3, '2026-11-20', 'old version'),
                              op(4, '2026-11-21', 'before deletion')):
                source.write('account-a', operation)
            source.write('account-b', op(5, '2026-11-19', 'other account'))
            with source.connect() as db:
                db.execute("INSERT INTO sessions VALUES ('synthetic-session','account-a',9999999999)")
            snapshot = backup(root / 'source.sqlite3', root / 'backups')
            device_notes = [exported(value) for value in (
                op(10, '2026-11-19', 'device alternate retained in archive'),
                op(11, '2026-11-20', 'selected device'),
                op(12, '2026-11-21', '', True),
                op(13, '2026-11-22', 'device only'))]
            device = root / 'device.json'
            device.write_text(json.dumps({'app': 'calendar182', 'version': 1,
                'notes': device_notes, 'history': device_notes, 'outbox': device_notes,
                'provenance': {'version': 1, 'storage': 'computer', 'account': 'account-a',
                               'serviceEpoch': source.epoch, 'cursor': 4}}))
            originals = {p: hashlib.sha256(p.read_bytes()).hexdigest()
                         for p in (root / 'source.sqlite3', snapshot, device)}
            report = compare(snapshot, device, 'account-a')
            choices = template(report)
            for item in choices['choices']:
                item['choice'] = 'keep_server' if item['date'] == '2026-11-19' else 'use_device'
                item['confirmDeletion'] = item['date'] == '2026-11-21'
            reviewed = plan(report, choices)
            self.assertTrue(reviewed['choicesComplete'])
            self.assertFalse(reviewed['executable'])
            self.assertEqual(len(reviewed['unresolvedOperations']), 4)

            # Explicit fixture-only reconstruction in a NEW directory. This does not
            # make arbitrary plans executable or reconcile real device outboxes.
            destination = root / 'candidate'
            restore(snapshot, destination)
            recovered = Store(destination / 'sync.sqlite3')
            self.assertNotEqual(recovered.epoch, source.epoch)
            # Preserve every exported version/pending edit, including unselected text.
            (destination / 'device-export.json').write_bytes(device.read_bytes())
            (destination / 'review-plan.json').write_text(json.dumps(reviewed))
            _, _, current, _ = load_export(device)
            for number, decision in enumerate(reviewed['decisions'], 100):
                if decision['choice'] == 'use_device':
                    selected = current[decision['date']]
                    # New IDs preserve original immutable operation IDs and history.
                    recovered.write('account-a', op(number, selected['date'], selected['text'], selected['deleted']))
            with readonly(destination / 'sync.sqlite3') as db:
                self.assertEqual(validate(db), {'operations': 8, 'records': 5})
                self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0], 0)
            notes = {row['date']: row for row in recovered.changes('account-a', 0, 100)['changes']}
            self.assertEqual(notes['2026-11-19']['text'], 'keep server')
            self.assertEqual(notes['2026-11-20']['text'], 'selected device')
            self.assertTrue(notes['2026-11-21']['deleted'])
            self.assertEqual(notes['2026-11-22']['text'], 'device only')
            self.assertEqual([r['text'] for r in recovered.history('account-a', '2026-11-20')],
                             ['selected device', 'old version'])
            self.assertEqual(recovered.history('account-b', '2026-11-19'), source.history('account-b', '2026-11-19'))
            # All original accepted operations retain their exact retry acknowledgement.
            self.assertEqual(recovered.write('account-a', op(3, '2026-11-20', 'old version')),
                             source.write('account-a', op(3, '2026-11-20', 'old version')))
            self.assertEqual(recovered.history('account-a', '2026-11-20')[0]['text'], 'selected device')
            archive = json.loads((destination / 'device-export.json').read_text())
            self.assertEqual(archive['outbox'], device_notes)
            with self.assertRaises(FileExistsError):
                restore(snapshot, destination)
            with source.connect() as db:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0], 1)
            self.assertEqual(originals, {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in originals})


if __name__ == '__main__':
    unittest.main()
