import json, sys

def summarize(path, label):
    d = json.load(open(path, encoding='utf-8'))
    files = d['files']
    grades = {}
    for f in files:
        g = f['grade']
        grades[g] = grades.get(g, 0) + 1
    bad = sorted([f for f in files if f['quality_score'] < 50], key=lambda x: x['quality_score'])
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(f"  Files analyzed : {d['files_analyzed']}")
    print(f"  Average score  : {d['average_score']}")
    print(f"  Overall grade  : {d['overall_grade']}")
    print(f"  Total smells   : {d['total_code_smells']}")
    print(f"  SOLID violations: {d['total_solid_violations']}")
    print(f"  Grade breakdown: {dict(sorted(grades.items()))}")
    print(f"\n  F-grade files (score < 50) — require mandatory refactor:")
    for f in bad[:30]:
        fname = f['file'].replace('\\', '/').split('/')[-1]
        smells = len(f['smells'])
        print(f"    [{f['grade']}] score={f['quality_score']:5.1f}  smells={smells:3d}  {fname}")
    if not bad:
        print("    (none)")

    # Collect smell type stats
    smell_types = {}
    for f in files:
        for s in f['smells']:
            t = s['type']
            sev = s['severity']
            key = f"{t} [{sev}]"
            smell_types[key] = smell_types.get(key, 0) + 1
    top = sorted(smell_types.items(), key=lambda x: -x[1])[:15]
    print(f"\n  Top smell types:")
    for k, v in top:
        print(f"    {v:5d}  {k}")

summarize('docs/inspection-quality-web-current.json', 'WEB (apps/web/src) — 238 files')
summarize('docs/inspection-quality-packages-current.json', 'PACKAGES (packages/) — 22 files')
