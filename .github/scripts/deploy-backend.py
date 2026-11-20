"""Swap the lion-backend container to an image built from the new app.jar.

Keeps the running container's configuration (environment, ports, network, restart policy and mounts),
waits for /health on the new container and restores the previous container if anything fails.
Secrets are never printed: only environment variable names are logged.
"""
import datetime
import json
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

NAME = 'lion-backend'
IMAGE = 'lion-fitness-backend'

release = Path(sys.argv[1]).resolve()
tag = sys.argv[2]
if not (release / 'app.jar').is_file() or not (release / 'Dockerfile').is_file():
    sys.exit('Invalid backend release directory')

DOCKER = ['docker']
if subprocess.run(DOCKER + ['info'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
    DOCKER = ['sudo', '-n', 'docker']


def docker(*args, check=True):
    result = subprocess.run(DOCKER + list(args), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if check and result.returncode != 0:
        raise RuntimeError(f'docker {args[0]} failed: {result.stderr.strip()[-500:]}')
    return result.stdout.strip()


info = json.loads(docker('inspect', NAME))[0]
if not info['State']['Running']:
    sys.exit('Existing backend container is not running; no changes made')
old_image_config = json.loads(docker('image', 'inspect', info['Image']))[0]['Config']
old_image_env = set(old_image_config.get('Env') or [])
if (info['Config'].get('Entrypoint') != old_image_config.get('Entrypoint')
        or info['Config'].get('Cmd') != old_image_config.get('Cmd')):
    sys.exit('Existing container uses a custom command; no changes made (update deploy-backend.py first)')
host = info['HostConfig']

run_args = ['run', '-d', '--name', NAME]
policy = host.get('RestartPolicy') or {}
if policy.get('Name') and policy['Name'] != 'no':
    retries = policy.get('MaximumRetryCount') or 0
    run_args += ['--restart', policy['Name'] + (f':{retries}' if policy['Name'] == 'on-failure' and retries else '')]
network = host.get('NetworkMode')
if network and network not in ('default', 'bridge'):
    run_args += ['--network', network]
published_port = None
for container_port, bindings in (host.get('PortBindings') or {}).items():
    port, _, proto = container_port.partition('/')
    for binding in bindings or []:
        host_ip = binding.get('HostIp') or ''
        host_port = binding.get('HostPort') or ''
        spec = f'{host_ip + ":" if host_ip else ""}{host_port}:{port}' + (f'/{proto}' if proto and proto != 'tcp' else '')
        run_args += ['-p', spec]
        if port == '8080' and host_port:
            published_port = host_port
for mount in info.get('Mounts') or []:
    suffix = '' if mount.get('RW', True) else ':ro'
    if mount.get('Type') == 'bind':
        run_args += ['-v', f"{mount['Source']}:{mount['Destination']}{suffix}"]
    elif mount.get('Type') == 'volume' and mount.get('Name'):
        run_args += ['-v', f"{mount['Name']}:{mount['Destination']}{suffix}"]
for extra in host.get('ExtraHosts') or []:
    run_args += ['--add-host', extra]
if host.get('Memory'):
    run_args += ['--memory', str(host['Memory'])]
env = [item for item in (info['Config'].get('Env') or []) if item not in old_image_env]
for item in env:
    run_args += ['-e', item]

print('Preserving env names:', ', '.join(sorted(item.split('=', 1)[0] for item in env)))
print('Restart:', policy.get('Name'), '| network:', network, '| port 8080 ->', published_port, '| mounts:', len(info.get('Mounts') or []))

new_image = f'{IMAGE}:{tag}'
docker('build', '-t', new_image, str(release))

stamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
backup = f'{NAME}-before-{tag}-{stamp}'


def health_url():
    if published_port:
        return f'http://127.0.0.1:{published_port}/health'
    if network == 'host':
        return 'http://127.0.0.1:8080/health'
    networks = json.loads(docker('inspect', NAME))[0]['NetworkSettings']['Networks']
    address = next((n.get('IPAddress') for n in networks.values() if n.get('IPAddress')), None)
    return f'http://{address}:8080/health' if address else None


def healthy():
    for _ in range(60):
        url = health_url()
        try:
            if url:
                with urllib.request.urlopen(url, timeout=3) as response:
                    if response.status == 200:
                        return True
        except OSError:
            pass
        state = json.loads(docker('inspect', NAME))[0]['State']
        if not state.get('Running') and state.get('Status') == 'exited':
            return False
        time.sleep(3)
    return False


docker('stop', NAME)
docker('rename', NAME, backup)
try:
    docker(*run_args, new_image)
    if not healthy():
        raise RuntimeError('Backend health check failed')
    print(f'BACKEND_DEPLOYED image={new_image} backup={backup}')
except Exception:
    logs = subprocess.run(DOCKER + ['logs', '--tail', '40', NAME], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True).stdout
    print('New container log tail:\n' + logs[-4000:])
    docker('rm', '-f', NAME, check=False)
    docker('rename', backup, NAME)
    docker('start', NAME)
    print('BACKEND_ROLLBACK previous container restored')
    raise
