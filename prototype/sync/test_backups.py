import concurrent.futures
import fcntl
import os
from pathlib import Path
import sqlite3
import stat
import tempfile
import time
import unittest
from unittest.mock import patch
from backups import backup, restore, readonly, validate, snapshots, BackupRunner
from server import Store


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / 'sync.sqlite3'
        self.store = Store(self.source)
        self.directory = self.root / 'backups'

    def tearDown(self):
        self.temp.cleanup()

    def write(self, number, text='synthetic backup note', deleted=False):
        return self.store.write('account-a', {'id': f'backup-test-operation-{number:06d}', 'date': '2026-11-17', 'text': '' if deleted else text, 'deleted': deleted})

    def test_online_wal_backup_during_writes_is_complete_and_private(self):
        self.write(1)
        with self.store.connect() as db:
            db.execute('INSERT INTO sessions VALUES (?,?,?)', ('synthetic-hash', 'account-a', 9999999999))
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                writer = executor.submit(lambda: [self.write(i) for i in range(2, 42)])
                path = backup(self.source, self.directory)
                writer.result()
        with readonly(path) as db:
            report = validate(db)
            self.assertGreaterEqual(report['operations'], 1)
            self.assertLessEqual(report['operations'], 41)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0], 0)
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.directory.stat().st_mode), 0o700)
        with readonly(self.source) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0], 1)

    def test_restore_new_directory_rotates_epoch_preserves_tombstones_and_retry_identity(self):
        first = self.write(1, 'old accepted text')
        self.write(2, deleted=True)
        path = backup(self.source, self.directory)
        expected = restore(path, self.root / 'restored')
        self.assertEqual(expected, {'operations': 2, 'records': 1})
        recovered = Store(self.root / 'restored' / 'sync.sqlite3')
        self.assertNotEqual(recovered.epoch, self.store.epoch)
        retry = recovered.write('account-a', {'id': 'backup-test-operation-000001', 'date': '2026-11-17', 'text': 'old accepted text', 'deleted': False})
        self.assertEqual(retry, first)
        self.assertTrue(recovered.history('account-a', '2026-11-17')[0]['deleted'])
        with self.assertRaises(FileExistsError):
            restore(path, self.root / 'restored')
        self.assertEqual(self.store.epoch, Store(self.source).epoch)

    def test_retention_and_failed_snapshot_keep_prior_verified_files(self):
        self.write(1)
        unrelated = self.directory / 'calendar182-personal.sqlite3'
        self.directory.mkdir()
        unrelated.write_text('unrelated file')
        for _ in range(4):
            backup(self.source, self.directory, keep=2)
        before = snapshots(self.directory)
        self.assertEqual(len(before), 2)
        with patch('backups.copy_database', side_effect=OSError('injected storage failure')):
            with self.assertRaises(OSError):
                backup(self.source, self.directory, keep=1)
        self.assertEqual(snapshots(self.directory), before)
        self.assertTrue(unrelated.is_file())
        self.assertEqual(list(self.directory.glob('*.tmp')), [])

    def test_invalid_snapshot_does_not_create_restore_destination(self):
        invalid = self.root / 'invalid.sqlite3'
        invalid.write_bytes(b'not a sqlite database')
        with self.assertRaises(sqlite3.DatabaseError):
            restore(invalid, self.root / 'unused')
        self.assertFalse((self.root / 'unused').exists())
        self.write(1)
        with self.store.connect() as db:
            db.execute('DELETE FROM current')
        with self.assertRaises(ValueError):
            backup(self.source, self.directory)
        self.assertEqual(snapshots(self.directory), [])

    def test_duplicate_service_schedulers_share_lock_and_interval(self):
        self.write(1)
        first = backup(self.source, self.directory)
        self.assertIsNone(backup(self.source, self.directory, minimum_age=3600))
        descriptor = os.open(self.directory / '.backup.lock', os.O_RDWR)
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertIsNone(backup(self.source, self.directory))
        finally:
            os.close(descriptor)
        self.assertEqual(snapshots(self.directory), [first])

    def test_scheduler_runs_repeatedly_and_survives_failure(self):
        self.write(1)
        runner = BackupRunner(self.source, self.directory, interval=0.05, keep=2)
        with patch('backups.backup', side_effect=OSError('injected storage failure')), patch('builtins.print'):
            runner.run_once()
        self.assertTrue(runner.failed)
        runner.start()
        try:
            deadline = time.monotonic() + 3
            while len(snapshots(self.directory)) < 2 and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertEqual(len(snapshots(self.directory)), 2)
            self.assertFalse(runner.failed)
            self.assertIsNotNone(runner.last_success)
        finally:
            runner.close()
        self.assertFalse(runner.thread.is_alive())


if __name__ == '__main__':
    unittest.main()
