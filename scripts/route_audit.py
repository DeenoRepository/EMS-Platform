import os, re, sys, datetime

API_DIR = 'apps/web/src/app/api'
SENSITIVE_PREFIXES = ('auth', 'setup', 'import', 'report', 'admin', 'backup', 'database', 'dump')


def run_audit():
    routes_no_rate_limit = []
    routes_no_auth = []
    routes_only_getuser_no_perm = []
    routes_sensitive_no_rl = []
    total = 0

    for root, dirs, files in os.walk(API_DIR):
        for fname in files:
            if fname != 'route.ts':
                continue
            total += 1
            path = os.path.join(root, fname)
            rel = path.replace('\\', '/')
            with open(path, encoding='utf-8', errors='ignore') as f:
                content = f.read()

            has_rate_limit = bool(re.search(r'enforceRateLimit|rateLimit', content))
            has_auth = bool(re.search(r'requireAuth|hasPermission|getCurrentUser', content))
            has_perm_check = bool(re.search(r'requireAuth|hasPermission|PERMISSIONS\.', content))
            has_only_getuser = has_auth and not has_perm_check

            path_parts = rel.lower().split('/')
            is_sensitive = any(p in path_parts for p in SENSITIVE_PREFIXES)

            if not has_rate_limit:
                routes_no_rate_limit.append(rel)
            if not has_auth:
                routes_no_auth.append(rel)
            if has_only_getuser:
                routes_only_getuser_no_perm.append(rel)
            if is_sensitive and not has_rate_limit:
                routes_sensitive_no_rl.append(rel)

    return {
        'total': total,
        'no_rate_limit': sorted(routes_no_rate_limit),
        'no_auth': sorted(routes_no_auth),
        'only_getuser_no_perm': sorted(routes_only_getuser_no_perm),
        'sensitive_no_rl': sorted(routes_sensitive_no_rl),
    }


def print_console_report(result):
    print(f"=== ROUTE SECURITY AUDIT ({API_DIR}) ===")
    print(f"Total route files: {result['total']}")
    print(f"Without rate limiting: {len(result['no_rate_limit'])}")
    print(f"Without any auth: {len(result['no_auth'])}")
    print(f"Only getCurrentUser (no RBAC): {len(result['only_getuser_no_perm'])}")
    print(f"Sensitive without rate limit: {len(result['sensitive_no_rl'])}")

    if result['no_auth']:
        print("\n=== ROUTES WITH NO AUTH ===")
        for r in result['no_auth']:
            print(f"  {r}")

    if result['sensitive_no_rl']:
        print("\n=== SENSITIVE ROUTES WITHOUT RATE LIMIT ===")
        for r in result['sensitive_no_rl']:
            print(f"  {r}")

    if result['only_getuser_no_perm']:
        print("\n=== ROUTES WITH getCurrentUser() BUT NO RBAC CHECK ===")
        for r in result['only_getuser_no_perm']:
            print(f"  {r}")

    if result['no_rate_limit']:
        print(f"\n=== ALL ROUTES WITHOUT RATE LIMIT ({len(result['no_rate_limit'])}) ===")
        for r in result['no_rate_limit']:
            print(f"  {r}")


def render_route_list(routes, empty_message):
    if not routes:
        return f"_{empty_message}_\n"
    return '\n'.join(f"- `{r}`" for r in routes) + '\n'


def write_markdown_report(result, out_path):
    measured_at = datetime.date.today().isoformat()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    content = f"""# Security route audit

> **Generated file — do not hand-edit.** Regenerate with
> `python scripts/route_audit.py --report`. This heuristic scan checks for
> the presence of rate-limiting and auth/RBAC call patterns in every
> `apps/web/src/app/api/**/route.ts` file — it does not verify correctness,
> only presence. Manual sign-off for known false positives (e.g. the login
> endpoint itself, ownership-scoped routes) is recorded in the latest
> inspection snapshot under
> [`docs/quality/inspections/`](inspections/), not here.
>
> Measured at: {measured_at}

## Summary

| Metric | Count |
|---|---:|
| Total route files scanned | {result['total']} |
| Without rate limiting | {len(result['no_rate_limit'])} |
| Without any auth pattern | {len(result['no_auth'])} |
| Only `getCurrentUser()`, no RBAC check | {len(result['only_getuser_no_perm'])} |
| Sensitive path without rate limit | {len(result['sensitive_no_rl'])} |

Sensitive path prefixes checked: `{', '.join(SENSITIVE_PREFIXES)}`.

## Routes with no auth pattern detected

{render_route_list(result['no_auth'], 'None')}

## Sensitive routes without rate limiting

{render_route_list(result['sensitive_no_rl'], 'None')}

## Routes using getCurrentUser() without an explicit RBAC check

{render_route_list(result['only_getuser_no_perm'], 'None')}

## All routes without rate limiting

{render_route_list(result['no_rate_limit'], 'None')}

---

## Reproducing this report

```bash
python scripts/route_audit.py --report
```
"""
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\nWrote {out_path}")


if __name__ == '__main__':
    audit_result = run_audit()
    print_console_report(audit_result)

    if '--report' in sys.argv:
        write_markdown_report(audit_result, os.path.join('docs', 'quality', 'SECURITY_BASELINE.md'))
