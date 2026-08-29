import json, sys, subprocess, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
CHECKER_PY = os.path.join(ROOT_DIR, '.agents', 'skills', 'code-reviewer', 'scripts', 'code_quality_checker.py')

def analyze(target_path, label):
    cmd = [sys.executable, CHECKER_PY, target_path, '--language', 'typescript', '--json']
    res = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True, encoding='utf-8')
    if res.returncode != 0:
        print(f"Error analyzing {target_path}: {res.stderr}")
        return
    d = json.loads(res.stdout)
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

if __name__ == '__main__':
    analyze('apps/web/src', 'WEB (apps/web/src)')
    analyze('packages', 'PACKAGES (packages/)')
