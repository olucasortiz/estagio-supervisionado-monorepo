"""Activate a built Next standalone release, preserving PM2 environment and rollback."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.request

release = Path(sys.argv[1]).resolve()
base = Path.home() / 'lion-frontend-releases'
if release.parent != base or not (release / 'server.js').is_file():
    sys.exit('Invalid frontend release directory')
apps = json.loads(subprocess.check_output(['pm2', 'jlist']))
old = next((app['pm2_env'] for app in apps if app['name'] == 'lion-frontend'), None)
if old is None:
    sys.exit('Existing frontend process not found; no changes made')
old_config = {'name': 'lion-frontend', 'script': old['pm_exec_path'],
              'cwd': old['pm_cwd'], 'env': old.get('env', {})}
new_config = dict(old_config, script=str(release / 'server.js'), cwd=str(release))
new_config['env'] = dict(old_config['env'], NODE_ENV='production', PORT='3000', HOSTNAME='0.0.0.0')

def activate(config):
    descriptor, filename = tempfile.mkstemp(prefix='lion-pm2-', suffix='.json')
    try:
        with os.fdopen(descriptor, 'w') as handle:
            json.dump({'apps': [config]}, handle)
        subprocess.run(['pm2', 'startOrReload', filename, '--only', 'lion-frontend', '--update-env'], check=True)
    finally:
        os.unlink(filename)

def healthy():
    for attempt in range(30):
        try:
            with urllib.request.urlopen('http://127.0.0.1:3000/login', timeout=3) as response:
                html = response.read().decode()
            running = json.loads(subprocess.check_output(['pm2', 'jlist']))
            current = next(app['pm2_env'] for app in running if app['name'] == 'lion-frontend')
            if response.status == 200 and '03-LOGO-ORIGINAL-LION' in html and current['pm_exec_path'] == str(release / 'server.js'):
                return True
        except (OSError, ValueError, StopIteration):
            pass
        time.sleep(2)
    return False

try:
    activate(new_config)
    if not healthy():
        raise RuntimeError('Frontend verification failed')
    subprocess.run(['pm2', 'save'], check=True)
    print('FRONTEND_DEPLOYED release=' + release.name + ' previous=' + old_config['cwd'])
except Exception:
    activate(old_config)
    print('FRONTEND_ROLLBACK previous process restored')
    raise