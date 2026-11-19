"""Verified snapshot bundles in an explicitly selected, existing backup root."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile


def digest(path):
    result = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def verify_copy(bundle):
    # Import lazily to avoid a module cycle with the backup scheduler.
    from backups import readonly, validate
    bundle = Path(bundle)
    database, manifest = bundle / 'snapshot.sqlite3', bundle / 'manifest.json'
    if database.is_symlink() or manifest.is_symlink():
        raise ValueError('Backup bundle must contain regular local files')
    metadata = json.loads(manifest.read_text())
    if not isinstance(metadata, dict):
        raise ValueError('Backup copy manifest must be an object')
    if metadata.get('format') != 'calendar182-sync-snapshot-v1' or metadata.get('sha256') != digest(database):
        raise ValueError('Backup copy checksum or format mismatch')
    with readonly(database) as db:
        report = validate(db)
        if db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0]:
            raise ValueError('Backup copy unexpectedly contains sessions')
    if any(metadata.get(key) != report[key] for key in ('operations', 'records')):
        raise ValueError('Backup copy counts do not match its manifest')
    return report


def export_copy(snapshot, root):
    from backups import readonly, validate
    snapshot = Path(snapshot).resolve(strict=True)
    if not re.fullmatch(r'calendar182-\d{8}T\d{12}Z-[0-9a-f]{8}\.sqlite3', snapshot.name):
        raise ValueError('Choose a verified Calendar snapshot, not a live database')
    with readonly(snapshot) as db:
        report = validate(db)
        if db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0]:
            raise ValueError('Snapshot contains sign-in sessions')
    # Never recreate a missing mount/cloud root on the computer's system disk.
    root = Path(root).resolve(strict=True)
    if not root.is_dir():
        raise ValueError('Backup destination root must be an existing directory')
    directory = root / 'Calendar182Backups'
    if directory.is_symlink():
        raise ValueError('Backup subdirectory cannot be a symbolic link')
    directory.mkdir(mode=0o700, exist_ok=True)
    descriptor = os.open(directory / '.copy.lock', os.O_CREAT | os.O_RDWR, 0o600)
    try:
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return None
        target = directory / snapshot.stem
        if target.is_symlink():
            raise ValueError('Backup bundle cannot be a symbolic link')
        expected_hash = digest(snapshot)
        if target.exists():
            verify_copy(target)
            if json.loads((target / 'manifest.json').read_text())['sha256'] != expected_hash:
                raise ValueError('Destination already holds different data; nothing overwritten')
            return target
        temporary = Path(tempfile.mkdtemp(prefix='.incoming-', dir=directory))
        try:
            database = temporary / 'snapshot.sqlite3'
            with open(snapshot, 'rb') as original, open(database, 'xb') as copied:
                os.chmod(database, 0o600)
                shutil.copyfileobj(original, copied, length=1024 * 1024)
                copied.flush()
                os.fsync(copied.fileno())
            if digest(database) != expected_hash:
                raise ValueError('Snapshot changed or copy was incomplete')
            metadata = {'format': 'calendar182-sync-snapshot-v1', 'sha256': expected_hash, **report}
            manifest = temporary / 'manifest.json'
            fd = os.open(manifest, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'w') as stream:
                json.dump(metadata, stream, indent=2)
                stream.flush()
                os.fsync(stream.fileno())
            verify_copy(temporary)
            # Publishing a nonempty directory does not replace another bundle.
            os.rename(temporary, target)
            parent = os.open(directory, os.O_RDONLY)
            try:
                os.fsync(parent)
            finally:
                os.close(parent)
            return target
        finally:
            # Only this attempt's own temporary directory is eligible for cleanup.
            if temporary.exists():
                shutil.rmtree(temporary)
    finally:
        os.close(descriptor)
