"""Generate isolated local-test certificates; never install them into a trust store."""
import argparse
import ipaddress
import os
import hashlib
from pathlib import Path
import plistlib
import subprocess
import ssl
import uuid


def configuration_profile(certificate):
    identity = str(uuid.UUID(bytes=hashlib.sha256(certificate).digest()[:16])).upper()
    return plistlib.dumps({
        'PayloadType': 'Configuration', 'PayloadVersion': 1,
        'PayloadIdentifier': 'org.calendar182.local-test', 'PayloadUUID': identity,
        'PayloadDisplayName': 'Calendar182 Local HTTPS Test',
        'PayloadDescription': 'Local Calendar test certificate only. No device management or VPN settings.',
        'PayloadRemovalDisallowed': False,
        'PayloadContent': [{
            'PayloadType': 'com.apple.security.root', 'PayloadVersion': 1,
            'PayloadIdentifier': 'org.calendar182.local-test.root',
            'PayloadUUID': str(uuid.uuid5(uuid.UUID(identity), 'root')).upper(),
            'PayloadDisplayName': 'Calendar182 Local Test CA',
            'PayloadCertificateFileName': 'calendar-local-ca.cer', 'PayloadContent': certificate,
        }],
    })


def run(*arguments):
    return subprocess.run(['openssl', *map(str, arguments)], check=True,
                          capture_output=True, text=True).stdout


def prepare(directory, address):
    address = str(ipaddress.ip_address(address))
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(directory, 0o700)
    files = {name: directory / name for name in ('ca.pem', 'ca-key.pem', 'server.pem', 'server-key.pem')}
    if any(path.exists() for path in files.values()):
        if not all(path.is_file() for path in files.values()):
            raise ValueError('Partial certificate directory; inspect it before retrying. Existing keys were not replaced.')
        run('x509', '-in', files['server.pem'], '-noout', '-checkip', address)
        run('x509', '-in', files['server.pem'], '-noout', '-checkend', '86400')
    else:
        previous = os.umask(0o077)
        try:
            run('req', '-x509', '-newkey', 'rsa:3072', '-nodes', '-sha256', '-days', '365',
                '-subj', '/CN=Calendar182 Local Test CA', '-keyout', files['ca-key.pem'], '-out', files['ca.pem'],
                '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0',
                '-addext', 'keyUsage=critical,keyCertSign,cRLSign')
            csr = directory / 'server.csr'
            run('req', '-new', '-newkey', 'rsa:3072', '-nodes', '-sha256',
                '-subj', '/CN=Calendar182 Local Test Server', '-keyout', files['server-key.pem'], '-out', csr)
            extensions = directory / 'server-extensions.cnf'
            extensions.write_text('basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n'
                                  f'subjectAltName=IP:{address},IP:127.0.0.1,DNS:localhost\n')
            run('x509', '-req', '-in', csr, '-CA', files['ca.pem'], '-CAkey', files['ca-key.pem'],
                '-CAcreateserial', '-out', files['server.pem'], '-days', '90', '-sha256', '-extfile', extensions)
        finally:
            os.umask(previous)
    for name in ('ca-key.pem', 'server-key.pem'):
        os.chmod(files[name], 0o600)
    public = directory / 'calendar-local-ca.cer'
    public.write_bytes(ssl.PEM_cert_to_DER_cert(files['ca.pem'].read_text()))
    (directory / 'calendar-local-ca.mobileconfig').write_bytes(configuration_profile(public.read_bytes()))
    run('verify', '-CAfile', files['ca.pem'], '-verify_ip', address, files['server.pem'])
    return run('x509', '-in', files['ca.pem'], '-noout', '-fingerprint', '-sha256').strip()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ip', required=True)
    parser.add_argument('--directory', default=str(Path(__file__).with_name('.data') / 'local-https'))
    args = parser.parse_args()
    print(prepare(args.directory, args.ip))
    print(f'Public certificate: {Path(args.directory).resolve() / "calendar-local-ca.cer"}')
    print('No device or system trust settings were changed. Keep both private keys private.')
