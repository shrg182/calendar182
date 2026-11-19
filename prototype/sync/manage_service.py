"""Prepare/install only Calendar182's own per-user launch agents. No sudo required."""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import sys
import tempfile

REPOSITORY = Path(__file__).resolve().parents[2]
LABELS = {'http': 'com.ruixing.calendar182.http', 'https': 'com.ruixing.calendar182.https'}


def make_plans(repository, interpreter, copy_root, lan_ip):
    repository, interpreter, copy_root = map(lambda path: Path(path).resolve(), (repository, interpreter, copy_root))
    ipaddress.ip_address(lan_ip)
    data = repository / 'prototype/sync/.data/calendar-stage'
    tls = repository / 'prototype/sync/.data/local-https'
    script = repository / 'prototype/sync/server.py'
    for required in (interpreter, script, data / 'sync.sqlite3', data / 'test-credentials.json',
                     repository / 'prototype/sync/calendar-dist/index.html', tls / 'ca.pem', tls / 'server.pem', tls / 'server-key.pem'):
        if not required.is_file():
            raise ValueError(f'Required existing runtime file missing: {required.name}')
    if not copy_root.is_dir():
        raise ValueError('Selected backup root is unavailable; no startup configuration written')
    plans = {}
    for mode, label in LABELS.items():
        arguments = [str(interpreter), '-u', str(script), '--host', '0.0.0.0', '--allow-host', lan_ip,
                     '--port', '8791' if mode == 'http' else '8792', '--data-dir', str(data),
                     '--calendar-dist', str(repository / 'prototype/sync/calendar-dist'),
                     '--ca-cert', str(tls / 'ca.pem'), '--backup-copy-root', str(copy_root)]
        if mode == 'https':
            arguments += ['--certfile', str(tls / 'server.pem'), '--keyfile', str(tls / 'server-key.pem')]
        plans[label] = {
            'Label': label, 'ProgramArguments': arguments, 'WorkingDirectory': str(repository),
            'RunAtLoad': True, 'KeepAlive': True, 'ThrottleInterval': 10, 'ExitTimeOut': 35,
            'ProcessType': 'Background', 'Umask': 0o077,
            'EnvironmentVariables': {'PYTHONUNBUFFERED': '1', 'CALENDAR182_LAUNCH_AGENT': '1'},
            'StandardOutPath': str(data / 'logs' / f'{mode}.out.log'),
            'StandardErrorPath': str(data / 'logs' / f'{mode}.err.log'),
        }
    return plans


def prepare(lan_ip):
    data = REPOSITORY / 'prototype/sync/.data/calendar-stage'
    saved = json.loads((data / 'backup-copy-config.json').read_text())
    plans = make_plans(REPOSITORY, sys.executable, saved['copy_root'], lan_ip)
    directory = REPOSITORY / 'prototype/sync/.data/startup'
    if directory.is_symlink() or (data / 'logs').is_symlink():
        raise ValueError('Refusing symlink startup/log directories')
    directory.mkdir(mode=0o700, exist_ok=True)
    logs = data / 'logs'
    logs.mkdir(mode=0o700, exist_ok=True)
    os.chmod(logs, 0o700)
    for label, plan in plans.items():
        for name in ('StandardOutPath', 'StandardErrorPath'):
            path = Path(plan[name])
            if path.is_symlink():
                raise ValueError('Refusing a symlink log file')
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            os.close(fd)
            os.chmod(path, 0o600)
        path = directory / f'{label}.plist'
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'wb') as stream:
            plistlib.dump(plan, stream)
        print(f'Prepared {path}')
    print('No launch agents installed or started yet.')


def loaded(label):
    result = subprocess.run(['launchctl', 'print', f'gui/{os.getuid()}/{label}'], capture_output=True, text=True)
    return result.returncode == 0, result.stdout


def checked_plans():
    result = []
    for label in LABELS.values():
        source = REPOSITORY / 'prototype/sync/.data/startup' / f'{label}.plist'
        plan = plistlib.loads(source.read_bytes())
        if plan.get('Label') != label or plan.get('WorkingDirectory') != str(REPOSITORY):
            raise ValueError('Startup definition is not this Calendar repository')
        arguments = plan.get('ProgramArguments', [])
        if len(arguments) < 3 or arguments[2] != str(REPOSITORY / 'prototype/sync/server.py'):
            raise ValueError('Unexpected startup program; nothing installed')
        saved = json.loads((REPOSITORY / 'prototype/sync/.data/calendar-stage/backup-copy-config.json').read_text())
        address = arguments[arguments.index('--allow-host') + 1]
        expected = make_plans(REPOSITORY, sys.executable, saved['copy_root'], address)[label]
        if plan != expected:
            raise ValueError('Prepared startup settings differ from the selected configuration')
        result.append((label, source, plan))
    return result


def install():
    jobs = checked_plans()
    directory = Path.home() / 'Library/LaunchAgents'
    directory.mkdir(exist_ok=True)
    # Complete preflight before stopping/changing anything. Never kill listeners.
    for label, source, plan in jobs:
        target = directory / source.name
        if target.is_symlink() or (target.exists() and plistlib.loads(target.read_bytes()) != plan):
            raise ValueError('Existing startup file differs; it was not overwritten')
        active, _ = loaded(label)
        if active and not target.exists():
            raise ValueError('An unknown job already uses this label; no changes made')
        if not active:
            arguments = plan['ProgramArguments']
            port = arguments[arguments.index('--port') + 1]
            busy = subprocess.run(['lsof', '-nP', f'-iTCP:{port}', '-sTCP:LISTEN'], capture_output=True)
            if busy.returncode == 0:
                raise ValueError(f'Port {port} is still occupied. Stop the known manual Calendar process before installation.')
    for label, source, _ in jobs:
        target = directory / source.name
        if not target.exists():
            fd, temporary = tempfile.mkstemp(prefix='.calendar182-', dir=directory)
            try:
                with os.fdopen(fd, 'wb') as stream:
                    stream.write(source.read_bytes())
                os.chmod(temporary, 0o600)
                os.replace(temporary, target)
            finally:
                Path(temporary).unlink(missing_ok=True)
        subprocess.run(['launchctl', 'enable', f'gui/{os.getuid()}/{label}'], check=True)
        if not loaded(label)[0]:
            subprocess.run(['launchctl', 'bootstrap', f'gui/{os.getuid()}', str(target)], check=True)
        print(f'Installed {label}')


def status():
    for label in LABELS.values():
        active, output = loaded(label)
        pid = re.search(r'\bpid = (\d+)', output)
        print(f'{label}: {"loaded" if active else "not loaded"}; PID {pid.group(1) if pid else "not running"}')


def uninstall():
    for label in LABELS.values():
        target = Path.home() / 'Library/LaunchAgents' / f'{label}.plist'
        if target.is_symlink():
            raise ValueError('Refusing a symlink startup file')
        if not target.exists():
            continue
        plan = plistlib.loads(target.read_bytes())
        if plan.get('Label') != label or plan.get('WorkingDirectory') != str(REPOSITORY):
            raise ValueError('Startup file is not owned by this Calendar repository')
        arguments = plan.get('ProgramArguments', [])
        if len(arguments) < 3 or arguments[2] != str(REPOSITORY / 'prototype/sync/server.py'):
            raise ValueError('Startup program is not this Calendar service')
        if loaded(label)[0]:
            subprocess.run(['launchctl', 'bootout', f'gui/{os.getuid()}/{label}'], check=True)
        target.unlink()
        print(f'Removed {label}; data and backups retained')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'install', 'status', 'uninstall'])
    parser.add_argument('--lan-ip', default='192.168.68.58')
    args = parser.parse_args()
    {'prepare': lambda: prepare(args.lan_ip), 'install': install, 'status': status, 'uninstall': uninstall}[args.action]()
