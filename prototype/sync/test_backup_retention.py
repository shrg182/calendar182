import datetime as dt
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
from backup_copies import export_copy, verify_copy
from backup_retention import plan, prune
from backups import backup, BackupRunner
from server import Store

UTC = dt.timezone.utc


class RetentionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.source = self.root / 'live.sqlite3'
        Store(self.source)
        self.local = self.root / 'local'
        self.snapshot = backup(self.source, self.local)
        self.destination = self.root / 'destination'
        self.destination.mkdir()
        self.directory = self.destination / 'Calendar182Backups'
        self.now = dt.datetime.now(UTC)
        self.serial = 0

    def tearDown(self):
        self.temp.cleanup()

    def bundle(self, when, kind='automatic'):
        self.serial += 1
        snapshot = self.local / f"calendar182-{when.strftime('%Y%m%dT%H%M%S%fZ')}-{self.serial:08x}.sqlite3"
        shutil.copyfile(self.snapshot, snapshot)
        path = export_copy(snapshot, self.destination)
        metadata = json.loads((path / 'manifest.json').read_text())
        if kind is None:
            metadata.pop('retentionSource')
        else:
            metadata['retentionSource'] = kind
        (path / 'manifest.json').write_text(json.dumps(metadata))
        return path

    def test_hourly_daily_weekly_selection_and_old_expiry(self):
        recent = self.bundle(self.now - dt.timedelta(hours=2))
        # Fixed local-day/week fixture, away from DST/date boundaries.
        now = dt.datetime(2026, 11, 21, 18, tzinfo=UTC)
        day_new = self.bundle(now - dt.timedelta(days=2))
        day_old = self.bundle(now - dt.timedelta(days=2, hours=1))
        week_new = self.bundle(now - dt.timedelta(days=10))
        week_old = self.bundle(now - dt.timedelta(days=11))
        expired = self.bundle(now - dt.timedelta(days=30))
        report = plan(self.directory, now)
        self.assertIn(day_new, report['keep'])
        self.assertIn(day_old, report['remove'])
        self.assertIn(week_new, report['keep'])
        self.assertIn(week_old, report['remove'])
        self.assertIn(expired, report['remove'])
        self.assertTrue(recent.exists())  # planning is read-only

    def test_pruning_requires_fresh_verified_replacement_and_preserves_manual_legacy(self):
        old = self.bundle(self.now - dt.timedelta(days=35))
        manual = self.bundle(self.now - dt.timedelta(days=36), 'manual')
        legacy = self.bundle(self.now - dt.timedelta(days=37), None)
        latest = self.bundle(self.now - dt.timedelta(minutes=1))
        self.assertEqual(prune(self.directory, old, self.now), 0)
        self.assertTrue(old.exists())
        self.assertEqual(prune(self.directory, latest, self.now), 1)
        self.assertFalse(old.exists())
        for path in (manual, legacy, latest):
            verify_copy(path)

    def test_invalid_pinned_extra_files_symlinks_and_future_are_preserved(self):
        corrupt = self.bundle(self.now - dt.timedelta(days=40))
        (corrupt / 'manifest.json').write_text('{}')
        pinned = self.bundle(self.now - dt.timedelta(days=41))
        meta = json.loads((pinned / 'manifest.json').read_text());meta['keep'] = True
        (pinned / 'manifest.json').write_text(json.dumps(meta))
        extra = self.bundle(self.now - dt.timedelta(days=42));(extra / 'owner-note.txt').write_text('keep')
        future = self.bundle(self.now + dt.timedelta(days=1))
        linked = self.directory / 'calendar182-20200101T120000000000Z-abcdef01'
        linked.symlink_to(extra, target_is_directory=True)
        latest = self.bundle(self.now - dt.timedelta(minutes=1))
        self.assertEqual(prune(self.directory, latest, self.now), 0)
        for path in (corrupt, pinned, extra, future, linked):
            self.assertTrue(path.exists())

    def test_failed_replacement_does_not_prune(self):
        old = self.bundle(self.now - dt.timedelta(days=35))
        with patch('backup_copies.shutil.copyfileobj', side_effect=OSError('failure')):
            with self.assertRaises(OSError):
                export_copy(self.snapshot, self.destination, automatic=True)
        self.assertTrue(old.exists())
        latest = self.bundle(self.now - dt.timedelta(minutes=1))
        (latest / 'manifest.json').write_text('{}')
        with self.assertRaises(ValueError):
            prune(self.directory, latest, self.now)
        self.assertTrue(old.exists())

    def test_scheduler_marks_automatic_manual_export_pins_and_idempotence_prunes(self):
        old = self.bundle(self.now - dt.timedelta(days=35))
        runner = BackupRunner(self.source, self.local, copy_root=self.destination)
        runner.run_once()
        latest = self.directory / self.snapshot.stem
        self.assertFalse(old.exists())
        self.assertEqual(json.loads((latest / 'manifest.json').read_text())['retentionSource'], 'automatic')
        export_copy(self.snapshot, self.destination)
        self.assertEqual(json.loads((latest / 'manifest.json').read_text())['retentionSource'], 'manual')
        runner.run_once()
        self.assertEqual(json.loads((latest / 'manifest.json').read_text())['retentionSource'], 'manual')


if __name__ == '__main__':
    unittest.main()
