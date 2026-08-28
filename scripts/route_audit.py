import os, re

API_DIR = 'apps/web/src/app/api'
SENSITIVE_PREFIXES = ('auth', 'setup', 'import', 'report', 'admin', 'backup', 'database', 'dump')

routes_no_rate_limit = []
routes_no_auth = []
routes_only_getuser_no_perm = []
routes_sensitive_no_rl = []

for root, dirs, files in os.walk(API_DIR):
    for fname in files:
        if fname != 'route.ts':
            continue
        path = os.path.join(root, fname)
        rel = path.replace('\\', '/')
        with open(path, encoding='utf-8', errors='ignore') as f:
            content = f.read()

        has_rate_limit = bool(re.search(r'enforceRateLimit|rateLimit', content))
        has_auth = bool(re.search(r'requireAuth|hasPermission|getCurrentUser', content))
        has_perm_check = bool(re.search(r'requireAuth|hasPermission|PERMISSIONS\.', content))
        has_only_getuser = has_auth and not has_perm_check

        # Check if route is under sensitive path
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

print(f"=== ROUTE SECURITY AUDIT ({API_DIR}) ===")
print(f"Total route files: {len(routes_no_rate_limit) + len([r for r in routes_no_rate_limit if r not in routes_no_rate_limit])}")
# Count total
total = 0
for root, dirs, files in os.walk(API_DIR):
    total += sum(1 for f in files if f == 'route.ts')
print(f"Total route files: {total}")
print(f"Without rate limiting: {len(routes_no_rate_limit)}")
print(f"Without any auth: {len(routes_no_auth)}")
print(f"Only getCurrentUser (no RBAC): {len(routes_only_getuser_no_perm)}")
print(f"Sensitive without rate limit: {len(routes_sensitive_no_rl)}")

if routes_no_auth:
    print("\n=== ROUTES WITH NO AUTH ===")
    for r in sorted(routes_no_auth):
        print(f"  {r}")

if routes_sensitive_no_rl:
    print("\n=== SENSITIVE ROUTES WITHOUT RATE LIMIT ===")
    for r in sorted(routes_sensitive_no_rl):
        print(f"  {r}")

if routes_only_getuser_no_perm:
    print("\n=== ROUTES WITH getCurrentUser() BUT NO RBAC CHECK ===")
    for r in sorted(routes_only_getuser_no_perm):
        print(f"  {r}")

if routes_no_rate_limit:
    print(f"\n=== ALL ROUTES WITHOUT RATE LIMIT ({len(routes_no_rate_limit)}) ===")
    for r in sorted(routes_no_rate_limit):
        print(f"  {r}")
