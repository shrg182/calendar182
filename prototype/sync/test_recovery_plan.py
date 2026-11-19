import copy
import json
from pathlib import Path
import tempfile
import unittest
from backups import backup
from recovery_preview import compare
from recovery_plan import template, plan
from server import Store


class PlanTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'source.sqlite3')
        self.store.write('account-a', {'id': 'server-operation-0001', 'date': '2026-11-19', 'text': 'server', 'deleted': False})
        self.device = self.root / 'device.json'
        self.data = {'app': 'calendar182', 'version': 1, 'notes': [
            {'operationId': 'device-operation-0001', 'date': '2026-11-19', 'text': '', 'deleted': True}],
            'history': [], 'outbox': []}
        self.device.write_text(json.dumps(self.data))
        self.snapshot = backup(self.root / 'source.sqlite3', self.root / 'backups')
        self.report = compare(self.snapshot, self.device, 'account-a')

    def tearDown(self):
        self.temp.cleanup()

    def test_template_defers_and_never_becomes_executable(self):
        decisions = template(self.report)
        result = plan(self.report, decisions)
        self.assertFalse(result['choicesComplete'])
        self.assertFalse(result['executable'])
        self.assertEqual(result['unresolvedOperations'][0]['status'], 'local_only_unclassified')
        decisions['choices'][0]['choice'] = 'keep_server'
        result = plan(self.report, decisions)
        self.assertTrue(result['choicesComplete'])
        self.assertFalse(result['executable'])
        self.assertEqual(result['decisions'][0]['effect'], 'select_saved_content')
        self.assertNotIn('text', result['decisions'][0]['selected'])

    def test_deletion_requires_explicit_confirmation(self):
        decisions = template(self.report)
        decisions['choices'][0]['choice'] = 'use_device'
        with self.assertRaises(ValueError):
            plan(self.report, decisions)
        decisions['choices'][0]['confirmDeletion'] = True
        result = plan(self.report, decisions)
        self.assertEqual(result['decisions'][0]['effect'], 'select_deleted_state')
        decisions['choices'][0]['choice'] = 'keep_server'
        with self.assertRaises(ValueError):
            plan(self.report, decisions)

    def test_missing_duplicate_unknown_and_invalid_choices_rejected(self):
        original = template(self.report)
        for changes in [[], original['choices'] * 2, [{'date': '2026-11-20', 'choice': 'defer', 'confirmDeletion': False}],
                        [{'date': '2026-11-19', 'choice': 'merge', 'confirmDeletion': False}],
                        [{'date': '2026-11-19', 'choice': 'use_device', 'confirmDeletion': 'yes'}]]:
            with self.subTest(choices=changes), self.assertRaises(ValueError):
                plan(self.report, {**original, 'choices': changes})
        with self.assertRaises(ValueError):
            plan(self.report, {**original, 'account': 'account-b'})

    def test_absence_is_not_deletion(self):
        report = copy.deepcopy(self.report)
        report['dates'][0]['device'] = None
        report['dates'][0]['status'] = 'server_only'
        decisions = template(report)
        decisions['choices'][0].update(choice='use_device', confirmDeletion=True)
        with self.assertRaises(ValueError):
            plan(report, decisions)

    def test_changed_history_or_service_invalidates_decisions(self):
        original = template(self.report)
        self.data['history'] = [{'operationId': 'history-operation-001', 'date': '2026-11-18', 'text': 'first', 'deleted': False}]
        self.device.write_text(json.dumps(self.data))
        report = compare(self.snapshot, self.device, 'account-a')
        with self.assertRaises(ValueError):
            plan(report, original)
        original = template(report)
        # Same IDs/current notes, only a non-current history payload changes.
        self.data['history'][0]['text'] = 'second'
        self.device.write_text(json.dumps(self.data))
        with self.assertRaises(ValueError):
            plan(compare(self.snapshot, self.device, 'account-a'), original)
        original = template(compare(self.snapshot, self.device, 'account-a'))
        with self.store.connect() as db:
            db.execute("UPDATE meta SET value='restored-epoch' WHERE key='epoch'")
        snapshot = backup(self.root / 'source.sqlite3', self.root / 'backups')
        with self.assertRaises(ValueError):
            plan(compare(snapshot, self.device, 'account-a'), original)

    def test_planning_preserves_input_bytes(self):
        before = self.snapshot.read_bytes(), self.device.read_bytes()
        plan(self.report, template(self.report))
        self.assertEqual(before, (self.snapshot.read_bytes(), self.device.read_bytes()))


if __name__ == '__main__':
    unittest.main()
