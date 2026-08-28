import json

d = json.load(open('docs/inspection-quality-web-current.json', encoding='utf-8'))
files = d['files']
bad = sorted([f for f in files if f['quality_score'] < 50], key=lambda x: x['quality_score'])
print('=== F-GRADE FILES WITH FULL PATHS ===')
for f in bad:
    path = f['file'].replace('\\', '/').replace('D:/Projects/EMS-Platform/', '')
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
