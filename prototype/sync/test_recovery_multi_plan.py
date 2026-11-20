import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from backups import backup
from server import Store
from recovery_multi import compare_devices
from recovery_multi_plan import template, plan, operation_requirements


def note(n, text, date='2026-11-19', deleted=False):
    return {'operationId': f'multi-plan-{n:08d}', 'date': date, 'text': text, 'deleted': deleted}


class MultiPlanTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'source.sqlite3')
        self.store.write('account-a', {'id': 'server-operation-0001', 'date': '2026-11-19', 'text': 'server', 'deleted': False})
        self.snapshot = backup(self.root / 'source.sqlite3', self.root / 'snapshots')
        self.exports = {}
        self.write('imac', [note(1, 'imac'), note(3, 'only imac', '2026-11-20')])
        self.write('ipad', [note(2, '', deleted=True)])

    def tearDown(self):
        self.temp.cleanup()

    def write(self, label, notes, history=()):
        path = self.root / f'{label}.json'
        path.write_text(json.dumps({'app': 'calendar182', 'version': 1, 'notes': notes,
                                   'history': list(history), 'outbox': notes}))
        self.exports[label] = path

    def report(self):
        return compare_devices(self.snapshot, self.exports, 'account-a')

    def test_defaults_defer_and_exact_device_selection(self):
        report = self.report()
        choices = template(report)
        self.assertFalse(plan(report, choices)['choicesComplete'])
        for item in choices['choices']:
            item.update(choice='select', source='imac')
        result = plan(report, choices)
        self.assertTrue(result['choicesComplete'])
        self.assertFalse(result['executable'])
        self.assertEqual([row['source'] for row in result['decisions']], ['imac', 'imac'])
        self.assertEqual(len(result['unresolvedOperations']), 3)
        self.assertFalse(result['accountBindingVerified'])
        choices['choices'][0]['source'] = 'server'
        self.assertEqual(plan(report, choices)['decisions'][0]['source'], 'server')

    def test_deletion_confirmation_and_missing_record(self):
        report = self.report(); choices = template(report)
        choices['choices'][0].update(choice='select', source='ipad')
        with self.assertRaises(ValueError):
            plan(report, choices)
        choices['choices'][0]['confirmDeletion'] = True
        self.assertEqual(plan(report, choices)['decisions'][0]['effect'], 'select_deleted_state')
        choices['choices'][1].update(choice='select', source='ipad', confirmDeletion=True)
        with self.assertRaises(ValueError):
            plan(report, choices)

    def test_malformed_duplicate_missing_and_wrong_account_choices_rejected(self):
        report = self.report(); original = template(report)
        for rows in [[], original['choices'] * 2,
                     [{**original['choices'][0], 'date': '2026-12-01'}, original['choices'][1]],
                     [{**original['choices'][0], 'source': 'imac'}, original['choices'][1]],
                     [{**original['choices'][0], 'confirmDeletion': 'yes'}, original['choices'][1]],
                     [{**original['choices'][0], 'choice': 'select', 'source': 'unknown'}, original['choices'][1]]]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                plan(report, {**original, 'choices': rows})
        with self.assertRaises(ValueError):
            plan(report, {**original, 'account': 'account-b'})
        with self.assertRaises(ValueError):
            plan(report, {**original, 'format': 'calendar182-recovery-choices-v1'})

    def test_history_change_device_removal_or_relabel_invalidates_whole_plan(self):
        original = template(self.report())
        self.write('ipad', [note(2, '', deleted=True)], [note(9, 'history edit')])
        with self.assertRaises(ValueError):
            plan(self.report(), original)
        original = template(self.report())
        renamed = {'imac': self.exports['imac'], 'tablet': self.exports['ipad']}
        with self.assertRaises(ValueError):
            plan(compare_devices(self.snapshot, renamed, 'account-a'), original)
        self.write('phone', [note(6, 'phone')])
        original = template(self.report())
        del self.exports['phone']
        with self.assertRaises(ValueError):
            plan(self.report(), original)

    def test_input_order_stable_and_history_conflicts_survive_complete_choices(self):
        self.write('imac', [note(1, 'server')], [note(9, 'one history')])
        self.write('ipad', [note(2, 'server')], [note(9, 'other history')])
        report = self.report(); choices = template(report)
        self.assertEqual(choices['choices'], [])
        reversed_report = compare_devices(self.snapshot, dict(reversed(list(self.exports.items()))), 'account-a')
        result = plan(reversed_report, choices)
        self.assertTrue(result['choicesComplete'])
        self.assertFalse(result['executable'])
        self.assertEqual(len(result['crossDeviceOperationConflicts']), 1)
        self.assertEqual(len(result['unresolvedOperations']), 4)
        self.assertNotIn('other history', json.dumps(result))

    def test_pending_reviews_default_defer_and_preserve_without_execution(self):
        report = self.report(); choices = template(report)
        self.assertEqual(len(choices['operationReviews']), 3)
        self.assertFalse(plan(report, choices)['operationReviewComplete'])
        for row in choices['operationReviews']:
            row['disposition'] = 'preserve_pending_edit'
        result = plan(report, choices)
        self.assertTrue(result['operationReviewComplete'])
        self.assertFalse(result['choicesComplete'])
        self.assertFalse(result['preservationPerformed'])
        self.assertFalse(result['executable'])
        self.assertEqual(len(result['unresolvedOperations']), 3)

    def test_acknowledgement_and_unclassified_history_have_distinct_dispositions(self):
        accepted = {'operationId': 'server-operation-0001', 'date': '2026-11-19', 'text': 'server', 'deleted': False}
        self.write('imac', [accepted], [note(9, 'unclassified historical version')])
        self.write('ipad', [note(2, 'ipad')])
        report = self.report(); choices = template(report)
        requirements = {(row['device'], row['operationId']): row['requiredDisposition']
                        for row in operation_requirements(report)}
        self.assertEqual(requirements[('imac', accepted['operationId'])], 'preserve_acknowledgement_evidence')
        self.assertEqual(requirements[('imac', note(9, '')['operationId'])], 'preserve_unclassified_history')
        for row in choices['operationReviews']:
            row['disposition'] = requirements[(row['device'], row['operationId'])]
        result = plan(report, choices)
        self.assertTrue(result['operationReviewComplete'])
        self.assertEqual(len(result['unresolvedOperations']), 3)

    def test_id_collision_requires_quarantine_even_for_accepted_device_copy(self):
        accepted = {'operationId': 'server-operation-0001', 'date': '2026-11-19', 'text': 'server', 'deleted': False}
        self.write('imac', [], [accepted])  # accepted history, not pending
        self.write('ipad', [{**accepted, 'text': 'conflicting payload'}])
        report = self.report(); choices = template(report)
        requirements = operation_requirements(report)
        self.assertEqual(len(requirements), 2)
        self.assertTrue(all(row['requiredDisposition'] == 'quarantine_conflicting_versions' for row in requirements))
        choices['operationReviews'][0]['disposition'] = 'preserve_acknowledgement_evidence'
        with self.assertRaises(ValueError):
            plan(report, choices)
        for row in choices['operationReviews']:
            row['disposition'] = 'quarantine_conflicting_versions'
        result = plan(report, choices)
        self.assertTrue(result['operationReviewComplete'])
        self.assertEqual(len(result['crossDeviceOperationConflicts']), 1)
        self.assertEqual(len(result['unresolvedOperations']), 2)

    def test_operation_review_rejects_missing_duplicate_unknown_and_destructive_actions(self):
        report = self.report(); choices = template(report)
        rows = choices['operationReviews']
        for invalid in [None, [], rows + [rows[0]],
                        [{**rows[0], 'device': 'unknown'}, *rows[1:]],
                        [{**rows[0], 'disposition': 'discard'}, *rows[1:]],
                        [{**rows[0], 'disposition': 'replay'}, *rows[1:]],
                        [{**rows[0], 'disposition': 'preserve_unclassified_history'}, *rows[1:]]]:
            with self.subTest(reviews=invalid), self.assertRaises(ValueError):
                plan(report, {**choices, 'operationReviews': invalid})
        with self.assertRaises(ValueError):
            plan(report, {**choices, 'format': 'calendar182-multi-recovery-choices-v1'})

    def test_completed_date_choices_cannot_hide_deferred_operations(self):
        report = self.report(); choices = template(report)
        for row in choices['choices']:
            row.update(choice='select', source='imac')
        result = plan(report, choices)
        self.assertTrue(result['choicesComplete'])
        self.assertFalse(result['operationReviewComplete'])
        self.assertFalse(result['executable'])
        self.assertEqual(len(result['unresolvedOperations']), 3)

    def test_identical_ids_on_devices_remain_separate_review_entries(self):
        same = note(1, 'same pending edit')
        self.write('imac', [same]); self.write('ipad', [same])
        report = self.report(); choices = template(report)
        self.assertEqual(len(choices['operationReviews']), 2)
        choices['operationReviews'][0]['disposition'] = 'preserve_pending_edit'
        result = plan(report, choices)
        self.assertFalse(result['operationReviewComplete'])
        self.assertEqual([row['disposition'] for row in result['operationReviews']], ['preserve_pending_edit', 'defer'])

    def test_cli_roundtrip_keeps_sources_unchanged(self):
        paths = [self.snapshot, *self.exports.values()]
        before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
        command = [sys.executable, '-B', str(Path(__file__).with_name('recovery_multi_plan.py')),
                   '--snapshot', str(self.snapshot), '--account', 'account-a']
        for label, path in self.exports.items():
            command += ['--device', label, str(path)]
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        choices = json.loads(result.stdout)
        path = self.root / 'choices.json'; path.write_text(json.dumps(choices))
        result = subprocess.run(command + ['--choices', str(path)], check=True, capture_output=True, text=True)
        self.assertFalse(json.loads(result.stdout)['executable'])
        choices['comparisonSha256'] = 'stale'; path.write_text(json.dumps(choices))
        result = subprocess.run(command + ['--choices', str(path)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, '')
        self.assertEqual(before, {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})


if __name__ == '__main__':
    unittest.main()
