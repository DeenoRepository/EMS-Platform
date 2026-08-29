import json, sys, subprocess, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
CHECKER_PY = os.path.join(ROOT_DIR, '.agents', 'skills', 'code-reviewer', 'scripts', 'code_quality_checker.py')

cmd = [sys.executable, CHECKER_PY, 'apps/web/src', '--language', 'typescript', '--json']
res = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True, encoding='utf-8')
if res.returncode != 0:
    print(f"Error: {res.stderr}")
    sys.exit(1)

d = json.loads(res.stdout)
files = d['files']
bad = sorted([f for f in files if f['quality_score'] < 50], key=lambda x: x['quality_score'])
print('=== F-GRADE FILES WITH FULL PATHS ===')
for f in bad:
    path = f['file'].replace('\\', '/').replace(ROOT_DIR.replace('\\', '/') + '/', '')
    score = f['quality_score']
    smells = len(f['smells'])
    funcs = f['metrics']['functions']
    lines = f['metrics']['lines']['total']
    complexity = f['metrics']['avg_complexity']
    critical = [s for s in f['smells'] if s['type'] not in ('magic_number',)]
    print(f'  [F] score={score:5.1f} lines={lines:5d} funcs={funcs:3d} cx={complexity:5.1f}  {path}')
    for s in critical[:3]:
        msg = s['message'][:80]
        print(f'       -> {s["type"]} [{s["severity"]}]: {msg}')
