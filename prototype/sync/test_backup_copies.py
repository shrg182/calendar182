from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch
from backup_copies import export_copy, verify_copy, digest
from backups import backup, restore, snapshots, BackupRunner, readonly
from server import Store


class CopyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / 'live.sqlite3'
        store = Store(self.source)
        store.write('account-a', {'id': 'copy-test-operation-00001', 'date': '2026-11-19', 'text': 'synthetic copy test', 'deleted': False})
        self.backups = self.root / 'local-backups'
        self.snapshot = backup(self.source, self.backups)
        self.destination = self.root / 'chosen-root'
        self.destination.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def test_verified_round_trip_and_idempotent_copy(self):
        bundle = export_copy(self.snapshot, self.destination)
        self.assertEqual(digest(self.snapshot), digest(bundle / 'snapshot.sqlite3'))
        self.assertEqual(verify_copy(bundle), {'operations': 1, 'records': 1})
        self.assertEqual(export_copy(self.snapshot, self.destination), bundle)
        self.assertEqual(len(list((self.destination / 'Calendar182Backups').glob('calendar182-*'))), 1)
        restore(bundle, self.root / 'restored')
        with readonly(self.root / 'restored' / 'sync.sqlite3') as recovered, readonly(self.source) as original:
            self.assertNotEqual(recovered.execute("SELECT value FROM meta WHERE key='epoch'").fetchone(), original.execute("SELECT value FROM meta WHERE key='epoch'").fetchone())

    def test_missing_root_is_not_created_and_live_database_is_refused(self):
        missing = self.root / 'unmounted' / 'backup-root'
        with self.assertRaises(FileNotFoundError):
            export_copy(self.snapshot, missing)
        self.assertFalse((self.root / 'unmounted').exists())
        with self.assertRaises(ValueError):
            export_copy(self.source, self.destination)

    def test_corrupted_copy_blocks_overwrite_and_restore(self):
        bundle = export_copy(self.snapshot, self.destination)
        manifest = bundle / 'manifest.json'
        metadata = json.loads(manifest.read_text())
        metadata['sha256'] = '0' * 64
        manifest.write_text(json.dumps(metadata))
        with self.assertRaises(ValueError):
            export_copy(self.snapshot, self.destination)
        with self.assertRaises(ValueError):
            restore(bundle, self.root / 'must-not-exist')
        self.assertFalse((self.root / 'must-not-exist').exists())
        self.assertTrue(self.snapshot.exists())
        self.assertEqual(json.loads(manifest.read_text())['sha256'], '0' * 64)

    def test_failed_copy_keeps_previous_bundle_and_local_snapshot(self):
        first = export_copy(self.snapshot, self.destination)
        second = backup(self.source, self.backups)
        with patch('backup_copies.shutil.copyfileobj', side_effect=OSError('injected destination failure')):
            with self.assertRaises(OSError):
                export_copy(second, self.destination)
        self.assertEqual(verify_copy(first)['operations'], 1)
        self.assertTrue(second.exists())
        self.assertEqual(list((self.destination / 'Calendar182Backups').glob('.incoming-*')), [])

    def test_scheduler_keeps_local_backups_when_destination_missing_then_catches_up(self):
        missing = self.root / 'temporarily-unavailable'
        runner = BackupRunner(self.source, self.backups, copy_root=missing)
        with patch('builtins.print'):
            runner.run_once()
        self.assertFalse(runner.failed)
        self.assertTrue(runner.copy_failed)
        self.assertEqual(len(snapshots(self.backups)), 1)
        missing.mkdir()
        runner.run_once()
        self.assertFalse(runner.copy_failed)
        bundle = next((missing / 'Calendar182Backups').glob('calendar182-*'))
        self.assertEqual(verify_copy(bundle)['operations'], 1)


if __name__ == '__main__':
    unittest.main()
