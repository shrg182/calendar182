"""Isolated test-note sync service. No production data or external dependencies."""
import argparse
import datetime
from contextlib import contextmanager
import hashlib
import hmac
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
import ssl
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit
from prepare_local_https import configuration_profile
from backups import BackupRunner

CLIENT = Path(__file__).with_name('client')


class Store:
    def __init__(self, path):
        self.path = str(path)
        with self.connect() as db:
            db.executescript('''
              PRAGMA journal_mode=WAL;
              CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS changes (
                revision INTEGER PRIMARY KEY AUTOINCREMENT,
                account TEXT NOT NULL, id TEXT NOT NULL, date TEXT NOT NULL,
                text TEXT NOT NULL, deleted INTEGER NOT NULL,
                UNIQUE(account,id));
              CREATE INDEX IF NOT EXISTS changes_account_revision ON changes(account,revision);
              CREATE TABLE IF NOT EXISTS current (
                account TEXT NOT NULL, date TEXT NOT NULL, revision INTEGER NOT NULL,
                PRIMARY KEY(account,date));
              CREATE TABLE IF NOT EXISTS sessions (
                hash TEXT PRIMARY KEY, account TEXT NOT NULL, expires INTEGER NOT NULL);
            ''')
            db.execute('INSERT OR IGNORE INTO meta VALUES (?,?)', ('epoch', secrets.token_hex(16)))
            self.epoch = db.execute("SELECT value FROM meta WHERE key='epoch'").fetchone()[0]

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA synchronous=FULL')
        try:
            yield db
        finally:
            db.close()

    @staticmethod
    def record(row):
        return {key: bool(row[key]) if key == 'deleted' else row[key]
                for key in ('id', 'date', 'text', 'deleted', 'revision')}

    def write(self, account, operation):
        if not isinstance(operation, dict):
            raise ValueError('Invalid operation')
        oid, date, text, deleted = (operation.get(k) for k in ('id', 'date', 'text', 'deleted'))
        if not isinstance(oid, str) or not re.fullmatch(r'[A-Za-z0-9_-]{16,100}', oid):
            raise ValueError('Invalid operation ID')
        if not isinstance(date, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
            raise ValueError('Invalid date')
        if datetime.date.fromisoformat(date).isoformat() != date or not '1901-01-01' <= date <= '2100-12-31':
            raise ValueError('Invalid date')
        if not isinstance(text, str) or type(deleted) is not bool or len(text) > 20000:
            raise ValueError('Invalid text or deletion')
        if (deleted and text != '') or (not deleted and not text.strip()):
            raise ValueError('Invalid text')
        text.encode('utf-8')
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            try:
                existing = db.execute('SELECT * FROM changes WHERE account=? AND id=?', (account, oid)).fetchone()
                if existing:
                    if (existing['date'], existing['text'], bool(existing['deleted'])) != (date, text, deleted):
                        raise ValueError('Operation ID reused with different content')
                    result = self.record(existing)
                else:
                    cursor = db.execute('INSERT INTO changes(account,id,date,text,deleted) VALUES (?,?,?,?,?)',
                                        (account, oid, date, text, deleted))
                    db.execute('INSERT OR REPLACE INTO current VALUES (?,?,?)', (account, date, cursor.lastrowid))
                    result = self.record(db.execute('SELECT * FROM changes WHERE revision=?', (cursor.lastrowid,)).fetchone())
                db.execute('COMMIT')
                return result
            except Exception:
                db.execute('ROLLBACK')
                raise

    def changes(self, account, cursor, limit):
        with self.connect() as db:
            maximum = db.execute('SELECT COALESCE(MAX(revision),0) FROM changes').fetchone()[0]
            if cursor > maximum:
                raise ValueError('Cursor is ahead of this service')
            rows = db.execute('SELECT * FROM changes WHERE account=? AND revision>? ORDER BY revision LIMIT ?',
                              (account, cursor, limit + 1)).fetchall()
        page = rows[:limit]
        return {'changes': [self.record(row) for row in page],
                'cursor': page[-1]['revision'] if page else cursor,
                'hasMore': len(rows) > limit, 'epoch': self.epoch}

    def history(self, account, date):
        with self.connect() as db:
            rows = db.execute('SELECT * FROM changes WHERE account=? AND date=? ORDER BY revision DESC LIMIT 100',
                              (account, date)).fetchall()
        return [self.record(row) for row in rows]


class SyncServer(ThreadingHTTPServer):
    backup_runner = None

    def server_close(self):
        if self.backup_runner:
            self.backup_runner.close()
        super().server_close()


class Handler(BaseHTTPRequestHandler):
    server_version = 'CalendarSyncPrototype'

    def log_message(self, *_):
        pass  # Never log credentials, cookies or note text.

    def send(self, status, data, cookie=None, content_type='application/json; charset=utf-8'):
        raw = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(raw)

    def guard(self, write=False):
        host = self.headers.get('Host', '')
        try:
            hostname = urlsplit('//' + host).hostname
        except ValueError:
            hostname = None
        if hostname not in self.server.allowed_hosts:
            self.send(403, {'error': 'Host not allowed'})
            return False
        if write and self.headers.get('Origin') != self.server.scheme + '://' + host:
            self.send(403, {'error': 'Same-origin browser request required'})
            return False
        return True

    def account(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get('Cookie', ''))
            token = cookie[self.server.session_cookie].value
        except (KeyError, ValueError):
            return None
        with self.server.store.connect() as db:
            row = db.execute('SELECT account FROM sessions WHERE hash=? AND expires>?',
                             (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
        account = row['account'] if row else None
        expected = self.headers.get('X-Calendar-Account')
        return account if not expected or expected == account else None

    def do_GET(self):
        if not self.guard():
            return
        path = urlsplit(self.path)
        if path.path == '/calendar/local-ca.cer' and self.server.ca_certificate:
            self.send(200, self.server.ca_certificate, content_type='application/pkix-cert')
            return
        if path.path == '/calendar/local-ca.mobileconfig' and self.server.ca_certificate:
            self.send(200, configuration_profile(self.server.ca_certificate), content_type='application/x-apple-aspen-config')
            return
        if path.path == '/calendar':
            self.send_response(302)
            self.send_header('Location', '/calendar/')
            self.end_headers()
            return
        if path.path.startswith('/calendar/') and self.server.calendar_dist:
            relative = path.path[len('/calendar/'):] or 'index.html'
            # Serve only the explicitly built app and its generated assets.
            allowed = relative == 'index.html' or relative in ('favicon.svg', 'lunar-javascript-LICENSE.txt', 'offline-worker.js') or re.fullmatch(r'assets/[A-Za-z0-9_-]+\.(?:js|css)', relative)
            asset = self.server.calendar_dist / relative
            if allowed and asset.is_file():
                self.send(200, asset.read_bytes(), content_type=mimetypes.guess_type(asset.name)[0] or 'application/octet-stream')
            else:
                self.send(404, {'error': 'Not found'})
            return
        assets = {'/': ('index.html', 'text/html; charset=utf-8'),
                  '/client.js': ('client.js', 'text/javascript; charset=utf-8'),
                  '/style.css': ('style.css', 'text/css; charset=utf-8')}
        if path.path in assets:
            name, content_type = assets[path.path]
            self.send(200, (CLIENT / name).read_bytes(), content_type=content_type)
            return
        account = self.account()
        if not account:
            self.send(401, {'error': 'Test sign-in required'})
            return
        try:
            query = parse_qs(path.query)
            if path.path == '/api/session':
                self.send(200, {'account': account, 'epoch': self.server.store.epoch})
            elif path.path == '/api/changes':
                cursor, limit = int(query.get('cursor', ['0'])[0]), int(query.get('limit', ['100'])[0])
                if cursor < 0 or not 1 <= limit <= 100:
                    raise ValueError('Invalid pagination')
                self.send(200, self.server.store.changes(account, cursor, limit))
            elif path.path == '/api/history':
                self.send(200, {'history': self.server.store.history(account, query.get('date', [''])[0])})
            else:
                self.send(404, {'error': 'Not found'})
        except ValueError:
            self.send(400, {'error': 'Invalid cursor, date or pagination'})

    def do_POST(self):
        if not self.guard(write=True):
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 100000 or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                self.send(400, {'error': 'JSON request of at most 100000 bytes required'})
                return
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError('Invalid object')
            path = urlsplit(self.path).path
            if path == '/api/login':
                account, token = body.get('account', ''), body.get('token', '')
                expected = self.server.credentials.get(account) if isinstance(account, str) else None
                if not expected or not isinstance(token, str) or not hmac.compare_digest(expected, token):
                    self.send(401, {'error': 'Incorrect test credentials'})
                    return
                session = secrets.token_urlsafe(32)
                with self.server.store.connect() as db:
                    db.execute('DELETE FROM sessions WHERE expires<=?', (int(time.time()),))
                    db.execute('INSERT INTO sessions VALUES (?,?,?)',
                               (hashlib.sha256(session.encode()).hexdigest(), account, int(time.time()) + 86400))
                secure = '; Secure' if self.server.scheme == 'https' else ''
                self.send(200, {'account': account, 'epoch': self.server.store.epoch},
                          f'{self.server.session_cookie}={session}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=86400{secure}')
                return
            account = self.account()
            if not account:
                self.send(401, {'error': 'Test sign-in required'})
            elif path == '/api/operations':
                if body.get('epoch') != self.server.store.epoch:
                    self.send(409, {'error': 'Service identity changed; preserve local data before resetting'})
                else:
                    self.send(200, {'record': self.server.store.write(account, body.get('operation'))})
            else:
                self.send(404, {'error': 'Not found'})
        except (ValueError, UnicodeError, TypeError):
            self.send(400, {'error': 'Invalid operation or JSON'})
        except sqlite3.Error:
            self.send(503, {'error': 'Storage unavailable; retry with the same operation ID'})


def make_server(host, port, data, allowed_hosts=(), calendar_dist=None, certfile=None, keyfile=None, ca_cert=None, backup_interval=None, backup_keep=168):
    if (backup_interval is not None and backup_interval < 0) or backup_keep < 1:
        raise ValueError('Invalid backup interval or retention')
    if bool(certfile) != bool(keyfile):
        raise ValueError('Both certfile and keyfile are required for HTTPS')
    ca_certificate = None
    if ca_cert:
        # Serve parsed public certificate bytes only, never raw input/key files.
        ca_certificate = ssl.PEM_cert_to_DER_cert(Path(ca_cert).read_text())
    context = None
    if certfile:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(certfile, keyfile)
    data = Path(data)
    data.mkdir(parents=True, exist_ok=True, mode=0o700)
    credentials_path = data / 'test-credentials.json'
    if not credentials_path.exists():
        fd = os.open(credentials_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump({name: secrets.token_urlsafe(32) for name in ('account-a', 'account-b')}, stream)
    server = SyncServer((host, port), Handler)
    server.scheme = 'https' if context else 'http'
    server.session_cookie = 'calendar_sync_test_https' if context else 'calendar_sync_test'
    server.ca_certificate = ca_certificate
    if context:
        server.socket = context.wrap_socket(server.socket, server_side=True)
    server.store = Store(data / 'sync.sqlite3')
    server.credentials = json.loads(credentials_path.read_text())
    server.allowed_hosts = {'127.0.0.1', 'localhost', *allowed_hosts}
    server.calendar_dist = Path(calendar_dist).resolve() if calendar_dist else None
    server.daemon_threads = True
    if backup_interval:
        server.backup_runner = BackupRunner(data / 'sync.sqlite3', data / 'backups', backup_interval, backup_keep)
        server.backup_runner.start()
    return server


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8790)
    parser.add_argument('--data-dir', default=str(Path(__file__).with_name('.data')))
    parser.add_argument('--allow-host', action='append', default=[])
    parser.add_argument('--calendar-dist', help='Serve an isolated Calendar build at /calendar/ (synthetic notes only)')
    parser.add_argument('--certfile', help='Local HTTPS server certificate (no automatic trust installation)')
    parser.add_argument('--keyfile', help='Private key for --certfile')
    parser.add_argument('--ca-cert', help='Public PEM CA certificate to offer at /calendar/local-ca.cer')
    parser.add_argument('--backup-interval', type=int, default=3600, help='Automatic snapshot interval in seconds; 0 disables')
    parser.add_argument('--backup-keep', type=int, default=168, help='Number of verified snapshots retained')
    args = parser.parse_args()
    if args.backup_interval < 0 or args.backup_keep < 1:
        parser.error('Backup interval must be nonnegative and retention at least 1')
    server = make_server(args.host, args.port, args.data_dir, args.allow_host, args.calendar_dist, args.certfile, args.keyfile, args.ca_cert, args.backup_interval, args.backup_keep)
    print(f'Test-note prototype listening on {args.host}:{server.server_port}', flush=True)
    print(f'Test credentials file: {Path(args.data_dir).resolve() / "test-credentials.json"}', flush=True)
    print(f'Automatic snapshot interval: {args.backup_interval}s; retained snapshots: {args.backup_keep}' if args.backup_interval else 'Automatic snapshots disabled', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
