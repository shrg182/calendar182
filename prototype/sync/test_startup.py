from pathlib import Path
import plistlib
import sys
import tempfile
import unittest
from manage_service import make_plans, LABELS


class StartupPlanTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        for name in ['prototype/sync/server.py', 'prototype/sync/.data/calendar-stage/sync.sqlite3',
                     'prototype/sync/.data/calendar-stage/test-credentials.json', 'prototype/sync/calendar-dist/index.html',
                     'prototype/sync/.data/local-https/ca.pem', 'prototype/sync/.data/local-https/server.pem',
                     'prototype/sync/.data/local-https/server-key.pem']:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('test runtime fixture')
        self.copy_root = self.root / 'selected cloud folder'
        self.copy_root.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def test_private_per_user_plans_preserve_exact_cloud_argument(self):
        plans = make_plans(self.root, sys.executable, self.copy_root, '192.168.68.58')
        self.assertEqual(set(plans), set(LABELS.values()))
        for plan in plans.values():
            self.assertEqual(plistlib.loads(plistlib.dumps(plan)), plan)
            self.assertTrue(plan['KeepAlive'])
            self.assertTrue(plan['RunAtLoad'])
            self.assertEqual(plan['Umask'], 0o077)
            args = plan['ProgramArguments']
            self.assertEqual(args[args.index('--backup-copy-root') + 1], str(self.copy_root))
            self.assertNotIn('token', ' '.join(args))
            self.assertEqual(plan['EnvironmentVariables']['CALENDAR182_LAUNCH_AGENT'], '1')

    def test_missing_data_does_not_generate_new_service_identity(self):
        (self.root / 'prototype/sync/.data/calendar-stage/sync.sqlite3').unlink()
        with self.assertRaises(ValueError):
            make_plans(self.root, sys.executable, self.copy_root, '192.168.68.58')
        self.assertFalse((self.root / 'prototype/sync/.data/calendar-stage/sync.sqlite3').exists())

    def test_invalid_network_or_missing_destination_is_refused(self):
        with self.assertRaises(ValueError):
            make_plans(self.root, sys.executable, self.copy_root, 'invalid-address')
        with self.assertRaises(ValueError):
            make_plans(self.root, sys.executable, self.root / 'unmounted', '192.168.68.58')
