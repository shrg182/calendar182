import concurrent.futures
import http.cookiejar
import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from server import Store, make_server


def operation(number, text='test', date='2026-11-16', deleted=False):
    return {'id': f'test-operation-{number:08d}', 'date': date, 'text': text, 'deleted': deleted}


class ProtocolTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'sync.sqlite3'
        self.store = Store(self.path)

    def tearDown(self):
        self.temp.cleanup()

    def test_retry_after_lost_ack_does_not_overwrite_newer_edit(self):
        first = self.store.write('a', operation(1, 'old offline text'))
        second = self.store.write('a', operation(2, 'new accepted text'))
        self.assertEqual(self.store.write('a', operation(1, 'old offline text')), first)
        with self.store.connect() as db:
            current = db.execute('SELECT c.text FROM current n JOIN changes c USING(revision) WHERE n.account=?', ('a',)).fetchone()
            self.assertEqual(current['text'], second['text'])
        self.assertEqual(len(self.store.history('a', '2026-11-16')), 2)
        with self.assertRaises(ValueError):
            self.store.write('a', operation(1, 'different payload'))

    def test_incremental_pagination_account_isolation_and_idle_bytes(self):
        for number in range(205):
            self.store.write('a', operation(number, 'x' * 8000))
        self.store.write('b', operation(0, 'private B'))
        cursor, revisions = 0, []
        while True:
            page = self.store.changes('a', cursor, 100)
            revisions += [note['revision'] for note in page['changes']]
            cursor = page['cursor']
            if not page['hasMore']:
                break
        self.assertEqual(revisions, list(range(1, 206)))
        idle = self.store.changes('a', cursor, 100)
        self.assertEqual(idle['changes'], [])
        self.assertLess(len(json.dumps(idle).encode()), 160)
        self.assertEqual(len(self.store.changes('b', 0, 100)['changes']), 1)
        self.assertEqual(self.store.history('b', '2026-11-17'), [])

    def test_acceptance_order_offline_delete_history_and_restart(self):
        self.store.write('a', operation(1, 'online'))
        deletion = self.store.write('a', operation(2, '', deleted=True))
        later = self.store.write('a', operation(3, 'offline edit uploaded later'))
        self.assertGreater(later['revision'], deletion['revision'])
        restarted = Store(self.path)
        self.assertEqual(restarted.epoch, self.store.epoch)
        self.assertEqual(restarted.write('a', operation(2, '', deleted=True)), deletion)
        self.assertEqual(len(restarted.history('a', '2026-11-16')), 3)

    def test_concurrent_acceptance_is_serialized(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda n: self.store.write('a', operation(n)), range(20)))
        self.assertEqual(sorted(note['revision'] for note in results), list(range(1, 21)))

    def test_invalid_values_leave_no_changes(self):
        for invalid in [operation(1, date='2026-02-30'), operation(1, text=''), operation(1, text='x'*20001), operation(1, text='delete', deleted=True)]:
            with self.assertRaises(ValueError):
                self.store.write('a', invalid)
        self.assertEqual(self.store.changes('a', 0, 100)['changes'], [])


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.server = make_server('127.0.0.1', 0, self.temp.name)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.server.server_port}'
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, data=None, origin=True, client=None):
        headers = {'Origin': self.base} if origin else {}
        if data is not None:
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(self.base + path, data=None if data is None else json.dumps(data).encode(), headers=headers)
        return (client or self.client).open(req)

    def login(self, account):
        return self.request('/api/login', {'account': account, 'token': self.server.credentials[account]})

    def test_calendar_assets_and_account_binding(self):
        root = Path(self.temp.name) / 'calendar-dist'
        (root / 'assets').mkdir(parents=True)
        (root / 'index.html').write_text('<html>Staging Calendar</html>')
        (root / 'assets' / 'index-test.js').write_text('console.log("test")')
        (root / 'secret.json').write_text('private')
        self.server.calendar_dist = root
        with self.request('/calendar/') as response:
            self.assertIn(b'Staging Calendar', response.read())
        with self.request('/calendar/assets/index-test.js') as response:
            self.assertIn('javascript', response.headers['Content-Type'])
        for path in ('/calendar/secret.json', '/calendar/../test-credentials.json', '/calendar/assets/../../secret.json'):
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.request(path)
            self.assertEqual(error.exception.code, 404)
            error.exception.close()
        epoch = json.load(self.login('account-a'))['epoch']
        self.login('account-b').close()
        req = urllib.request.Request(self.base + '/api/operations',
            data=json.dumps({'epoch': epoch, 'operation': operation(10)}).encode(),
            headers={'Origin': self.base, 'Content-Type': 'application/json', 'X-Calendar-Account': 'account-a'})
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.client.open(req)
        self.assertEqual(error.exception.code, 401)
        error.exception.close()
        self.assertEqual(self.server.store.changes('account-b', 0, 100)['changes'], [])

    def test_real_http_auth_origin_identity_and_isolation(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/api/changes')
        self.assertEqual(error.exception.code, 401)
        error.exception.close()
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/api/login', {'account': 'account-a', 'token': self.server.credentials['account-a']}, origin=False)
        self.assertEqual(error.exception.code, 403)
        error.exception.close()
        response = self.login('account-a')
        cookie = response.headers['Set-Cookie']
        self.assertIn('HttpOnly', cookie)
        self.assertIn('SameSite=Strict', cookie)
        epoch = json.load(response)['epoch']
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/api/operations', {'epoch': 'wrong', 'operation': operation(1)})
        self.assertEqual(error.exception.code, 409)
        error.exception.close()
        json.load(self.request('/api/operations', {'epoch': epoch, 'operation': operation(1, 'A only')}))
        self.login('account-b').close()
        self.assertEqual(json.load(self.request('/api/changes'))['changes'], [])
        self.assertEqual(json.load(self.request('/api/history?date=2026-11-16'))['history'], [])
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/.data/test-credentials.json')
        error.exception.close()
        with self.server.store.connect() as db:
            db.execute('UPDATE sessions SET expires=0')
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/api/changes')
        self.assertEqual(error.exception.code, 401)
        error.exception.close()


if __name__ == '__main__':
    unittest.main()
