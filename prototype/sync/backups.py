"""Private online SQLite snapshots and restore into a new, unused directory."""
import argparse
from contextlib import contextmanager, closing
import datetime
import fcntl
import json
import os
from pathlib import Path
import secrets
import re
import sqlite3
import tempfile
import threading
import time


@contextmanager
def readonly(path):
    db = sqlite3.connect(Path(path).resolve().as_uri() + '?mode=ro', uri=True, timeout=5)
    try:
        yield db
    finally:
        db.close()


def validate(db):
    if db.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
        raise ValueError('Database integrity check failed')
    required = {'meta', 'changes', 'current', 'sessions'}
    tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if not required <= tables:
        raise ValueError('Not a Calendar sync database')
    epoch = db.execute("SELECT value FROM meta WHERE key='epoch'").fetchone()
    if not epoch or not isinstance(epoch[0], str) or not epoch[0]:
        raise ValueError('Missing service identity')
    latest = db.execute('SELECT account,date,MAX(revision) FROM changes GROUP BY account,date ORDER BY account,date').fetchall()
    current = db.execute('SELECT account,date,revision FROM current ORDER BY account,date').fetchall()
    if latest != current:
        raise ValueError('Current records do not match accepted history')
    return {'operations': db.execute('SELECT COUNT(*) FROM changes').fetchone()[0], 'records': len(current)}


def copy_database(source, target):
    deadline = time.monotonic() + 30
    def progress(*_):
        if time.monotonic() > deadline:
            raise TimeoutError('Snapshot exceeded its time limit')
    with readonly(source) as original:
        with closing(sqlite3.connect(target)) as destination:
            original.backup(destination, pages=128, progress=progress, sleep=0.05)
            destination.execute('PRAGMA journal_mode=DELETE')
            validate(destination)
            # Expiring browser sessions are not recovery credentials.
            with destination:
                destination.execute('DELETE FROM sessions')


def durable_publish(temporary, destination):
    os.chmod(temporary, 0o600)
    with open(temporary, 'rb') as stream:
        os.fsync(stream.fileno())
    os.replace(temporary, destination)
    descriptor = os.open(destination.parent, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def snapshots(directory):
    return sorted(path for path in Path(directory).resolve().glob('calendar182-*.sqlite3') if path.is_file() and not path.is_symlink() and re.fullmatch(r'calendar182-\d{8}T\d{12}Z-[0-9a-f]{8}\.sqlite3', path.name))


def backup(source, directory, keep=168, minimum_age=0):
    if keep < 1:
        raise ValueError('Keep at least one verified snapshot')
    source, directory = Path(source).resolve(), Path(directory).resolve()
    if not source.is_file():
        raise ValueError('Source database does not exist')
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(directory, 0o700)
    lockfd = os.open(directory / '.backup.lock', os.O_CREAT | os.O_RDWR, 0o600)
    try:
        try:
            fcntl.flock(lockfd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return None
        existing = [path for path in snapshots(directory) if path != source]
        if existing and 0 <= time.time() - existing[-1].stat().st_mtime < minimum_age:
            return None
        fd, name = tempfile.mkstemp(prefix='.calendar182-backup-', suffix='.tmp', dir=directory)
        os.close(fd)
        temporary = Path(name)
        try:
            copy_database(source, temporary)
            with readonly(temporary) as db:
                validate(db)
            stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            destination = directory / f'calendar182-{stamp}-{secrets.token_hex(4)}.sqlite3'
            durable_publish(temporary, destination)
            # Prune only after a complete, verified replacement is published.
            for old in existing[:max(0, len(existing) + 1 - keep)]:
                old.unlink()
            return destination
        finally:
            temporary.unlink(missing_ok=True)
    finally:
        os.close(lockfd)


def restore(snapshot, destination):
    snapshot, destination = Path(snapshot).resolve(), Path(destination).absolute()
    if snapshot.is_dir():
        from backup_copies import verify_copy
        verify_copy(snapshot)
        snapshot = snapshot / 'snapshot.sqlite3'
    with readonly(snapshot) as db:
        expected = validate(db)
    # Never replace a running database, existing directory, or browser data.
    destination.mkdir(mode=0o700, parents=False, exist_ok=False)
    temporary = destination / '.restoring.sqlite3'
    try:
        copy_database(snapshot, temporary)
        with closing(sqlite3.connect(temporary)) as db, db:
            db.execute("UPDATE meta SET value=? WHERE key='epoch'", (secrets.token_hex(16),))
            db.execute('DELETE FROM sessions')
            if validate(db) != expected:
                raise ValueError('Restored record counts do not match the snapshot')
        durable_publish(temporary, destination / 'sync.sqlite3')
        return expected
    except Exception:
        temporary.unlink(missing_ok=True)
        # Remove only the empty directory created by this restore attempt.
        try:
            destination.rmdir()
        except OSError:
            pass
        raise


class BackupRunner:
    def __init__(self, source, directory, interval=3600, keep=168, copy_root=None):
        if interval <= 0 or keep < 1:
            raise ValueError('Invalid backup interval or retention')
        self.source, self.directory, self.interval, self.keep = source, directory, interval, keep
        self.stop = threading.Event()
        self.last_success = None
        self.failed = False
        self.copy_root = copy_root
        self.copy_failed = False
        self.copy_in_progress = False
        self.thread = threading.Thread(target=self.run, name='calendar-backup', daemon=True)

    def run_once(self):
        try:
            path = backup(self.source, self.directory, self.keep, self.interval)
            if path:
                self.last_success = time.time()
            self.failed = False
        except (OSError, ValueError, sqlite3.Error, TimeoutError):
            self.failed = True
            print('Calendar backup failed; existing snapshots retained. Check local backup storage.', flush=True)
        if self.copy_root:
            try:
                from backup_copies import export_copy
                available = snapshots(self.directory)
                if available:
                    self.copy_in_progress = True
                    copied = export_copy(available[-1], self.copy_root)
                    if copied:
                        self.record_copy_success()
                self.copy_failed = False
            except (OSError, ValueError, sqlite3.Error):
                self.copy_failed = True
                print('Calendar backup copy unavailable; local snapshots retained. Check the selected destination.', flush=True)
            finally:
                self.copy_in_progress = False

    def record_copy_success(self):
        directory = Path(self.source).parent
        fd, name = tempfile.mkstemp(prefix='.backup-health-', dir=directory)
        temporary = Path(name)
        try:
            with os.fdopen(fd, 'w') as stream:
                json.dump({'copyRoot': str(Path(self.copy_root).absolute()), 'lastCopyVerifiedAt': time.time()}, stream)
                stream.flush()
                os.fsync(stream.fileno())
            durable_publish(temporary, directory / 'backup-health.json')
        finally:
            temporary.unlink(missing_ok=True)

    def health(self):
        result = {'enabled': True, 'running': self.thread.is_alive(), 'intervalSeconds': self.interval,
                  'snapshotCount': 0, 'lastSnapshotAt': None, 'snapshotFailed': self.failed,
                  'copyConfigured': bool(self.copy_root), 'copyFailed': self.copy_failed,
                  'copyInProgress': self.copy_in_progress, 'lastCopyVerifiedAt': None}
        try:
            available = snapshots(self.directory)
            result['snapshotCount'] = len(available)
            if available:
                result['lastSnapshotAt'] = available[-1].stat().st_mtime
        except OSError:
            result['snapshotFailed'] = True
        if self.copy_root:
            try:
                saved = json.loads((Path(self.source).parent / 'backup-health.json').read_text())
                if saved.get('copyRoot') == str(Path(self.copy_root).absolute()):
                    stamp = saved.get('lastCopyVerifiedAt')
                    if isinstance(stamp, (int, float)) and not isinstance(stamp, bool) and 0 < stamp < 1e12:
                        result['lastCopyVerifiedAt'] = stamp
            except (OSError, ValueError, AttributeError):
                pass
        return result

    def run(self):
        while not self.stop.is_set():
            self.run_once()
            self.stop.wait(min(self.interval, 60))

    def start(self):
        self.thread.start()

    def close(self):
        self.stop.set()
        self.thread.join(timeout=31)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    create = commands.add_parser('create')
    create.add_argument('--source', required=True)
    create.add_argument('--directory', required=True)
    create.add_argument('--keep', type=int, default=168)
    recover = commands.add_parser('restore')
    recover.add_argument('--snapshot', required=True)
    recover.add_argument('--destination', required=True, help='New directory only; existing paths are refused')
    export = commands.add_parser('copy')
    export.add_argument('--snapshot', required=True)
    export.add_argument('--root', required=True, help='Existing external-drive/cloud-folder root selected by the owner')
    verify = commands.add_parser('verify-copy')
    verify.add_argument('--bundle', required=True)
    args = parser.parse_args()
    if args.command == 'create':
        result = backup(args.source, args.directory, args.keep)
        print(f'Verified snapshot: {result}' if result else 'Another snapshot is already in progress; retry later.')
    elif args.command == 'restore':
        result = restore(args.snapshot, args.destination)
        print(f'Restored {result["operations"]} operations and {result["records"]} records to a new directory. Service identity rotated; sign-in sessions cleared.')
    elif args.command == 'copy':
        from backup_copies import export_copy
        result = export_copy(args.snapshot, args.root)
        print(f'Verified local destination copy: {result}' if result else 'Another copy is in progress; retry later.')
    else:
        from backup_copies import verify_copy
        print(f'Copy verified: {verify_copy(args.bundle)}')
