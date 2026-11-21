"""Conservative retention for explicitly automatic destination bundles only."""
import datetime as dt
import json
from pathlib import Path
import re
import sqlite3
from zoneinfo import ZoneInfo

NAME = re.compile(r'calendar182-(\d{8}T\d{12}Z)-[0-9a-f]{8}$')
UTC = dt.timezone.utc
ZONE = ZoneInfo('America/Detroit')


def stamp(path):
    match = NAME.fullmatch(Path(path).name)
    return dt.datetime.strptime(match[1], '%Y%m%dT%H%M%S%fZ').replace(tzinfo=UTC) if match else None


def candidates(directory, now):
    from backup_copies import verify_copy
    valid, protected = [], 0
    for path in Path(directory).resolve(strict=True).iterdir():
        when = stamp(path)
        if when is None or not path.is_dir():
            continue
        try:
            if path.is_symlink() or {p.name for p in path.iterdir()} != {'snapshot.sqlite3', 'manifest.json'}:
                raise ValueError('Protected bundle')
            metadata = json.loads((path / 'manifest.json').read_text())
            if metadata.get('retentionSource') != 'automatic' or metadata.get('keep', False) or when > now:
                raise ValueError('Protected bundle')
            verify_copy(path)
            valid.append((path, when))
        except (OSError, ValueError, AttributeError, sqlite3.Error):
            protected += 1
    return valid, protected


def plan(directory, now=None):
    now = now or dt.datetime.now(UTC)
    valid, protected = candidates(directory, now)
    keep, remove, buckets = [], [], set()
    for path, when in sorted(valid, key=lambda item: item[1], reverse=True):
        age = now - when
        local = when.astimezone(ZONE)
        if age <= dt.timedelta(hours=24):
            retain = True
        elif age <= dt.timedelta(days=7):
            bucket = ('day', local.date())
            retain = bucket not in buckets
            buckets.add(bucket)
        elif age <= dt.timedelta(days=28):
            bucket = ('week', local.isocalendar()[:2])
            retain = bucket not in buckets
            buckets.add(bucket)
        else:
            retain = False
        (keep if retain else remove).append(path)
    # Planning alone never deletes; unmarked/manual/invalid bundles are untouched.
    return {'keep': keep, 'remove': remove, 'protected': protected}


def prune(directory, replacement, now=None):
    """Caller holds .copy.lock; only a fresh verified replacement permits deletion."""
    from backup_copies import verify_copy
    directory, replacement = Path(directory).resolve(strict=True), Path(replacement)
    now = now or dt.datetime.now(UTC)
    when = stamp(replacement)
    if replacement.parent.resolve(strict=True) != directory or replacement.is_symlink() or when is None or not dt.timedelta(0) <= now - when <= dt.timedelta(hours=24):
        return 0
    verify_copy(replacement)
    proposed = plan(directory, now)
    removed = 0
    for path in proposed['remove']:
        if stamp(path) >= when:
            continue
        # Recheck source marker and contents immediately before removing only
        # the two known files. Never recursively remove a directory.
        if path.is_symlink() or {p.name for p in path.iterdir()} != {'snapshot.sqlite3', 'manifest.json'}:
            continue
        metadata = json.loads((path / 'manifest.json').read_text())
        if metadata.get('retentionSource') != 'automatic' or metadata.get('keep', False):
            continue
        verify_copy(path)
        (path / 'snapshot.sqlite3').unlink()
        (path / 'manifest.json').unlink()
        path.rmdir()
        removed += 1
    return removed
