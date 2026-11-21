import concurrent.futures
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from server import Store
from shensha_settings import IDS, validate_settings
from backups import copy_database, readonly, validate


def settings(zone=''):
    return dict(version=1, zone=zone, birth=dict.fromkeys(('year','month','day','hour'), ''), selections={key:dict(enabled=False,targets=[]) for key in IDS})


def op(number, base=0, zone=''):
    return dict(id=f'settings-operation-{number:08d}',base=base,settings=settings(zone))


class SettingsTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=Path(self.temp.name)/'sync.sqlite3'
        self.store=Store(self.path)

    def tearDown(self):
        self.temp.cleanup()

    def test_revision_conflicts_idempotent_retry_and_account_isolation(self):
        first=self.store.write_shensha('a',op(1))
        newer=self.store.write_shensha('a',op(2,first['revision'],'Asia/Shanghai'))
        self.assertEqual(self.store.write_shensha('a',op(1)),first)
        self.assertEqual(self.store.shensha('a')['revision'],newer['revision'])
        self.assertFalse(self.store.write_shensha('a',op(3))['accepted'])
        self.assertEqual(self.store.shensha('b')['revision'],0)
        with self.assertRaises(ValueError):self.store.write_shensha('a',op(1,zone='UTC'))
        self.assertEqual(self.store.changes('a',0,100)['changes'],[])

    def test_simultaneous_initial_saves_accept_only_one(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results=list(pool.map(lambda n:self.store.write_shensha('a',op(n)),range(4)))
        self.assertEqual(sum(r['accepted'] for r in results),1)

    def test_validation_and_backup_preservation(self):
        bad=settings();bad['selections']['tiande']={'enabled':True,'targets':['invalid']}
        for value in [bad,{**settings(),'zone':'Bogus/Zone'},{**settings(),'birth':None},{**settings(),'version':True}]:
            with self.assertRaises(ValueError):validate_settings(value)
        accepted=self.store.write_shensha('a',op(1,zone='America/Detroit'))
        target=Path(self.temp.name)/'snapshot.sqlite3';copy_database(self.path,target)
        with readonly(target) as db:
            self.assertEqual(validate(db),{'operations':0,'records':0})
            self.assertEqual(json.loads(db.execute('SELECT settings FROM shensha_changes').fetchone()[0]),accepted['settings'])
        self.assertEqual(Store(target).shensha('a')['settings'],accepted['settings'])
