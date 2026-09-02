#!/usr/bin/env node
/**
 * Static security-policy gate for repository files not owned by ESLint.
 *
 * API TypeScript policies live in scripts/eslint-rules/. This script covers
 * environment templates, Compose files, migration/install commands, and
 * startup wiring. It is chained into `pnpm lint` so these checks no longer
 * masquerade as runtime tests.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(path) {
  return readFileSync(path, 'utf8');
}

function executableLines(source, commentPattern = /^\s*(#|\/\/)/) {
  return source
    .split('\n')
    .filter((line) => !commentPattern.test(line))
    .join('\n');
}

const failures = [];

function requireMatch(policy, file, pattern, message) {
  if (!pattern.test(read(file))) failures.push({ policy, file, message });
}

function forbidMatch(policy, file, pattern, message, transform = (value) => value) {
  if (pattern.test(transform(read(file)))) failures.push({ policy, file, message });
}

requireMatch(
  'env-example-no-demo-jira-token',
  '.env.example',
  /^JIRA_API_TOKEN=REPLACE_WITH_JIRA_TOKEN$/m,
  'JIRA_API_TOKEN must remain an explicit replacement placeholder.',
);
forbidMatch(
  'env-example-no-demo-jira-token',
  '.env.example',
  /^JIRA_API_TOKEN=adminpassword$/m,
  'Demo Jira credentials are forbidden.',
);

for (const file of ['docker-compose.yml', 'docker-compose.prod.yml', 'docker-compose.offline.yml']) {
  requireMatch(
    'compose-requires-postgres-secret',
    file,
    /POSTGRES_PASSWORD:\s*\$\{POSTGRES_PASSWORD:\?/,
    'POSTGRES_PASSWORD must be required from the environment.',
  );
  requireMatch(
    'compose-requires-jwt-secret',
    file,
    /JWT_SECRET:\s*\$\{JWT_SECRET:\?/,
    'JWT_SECRET must be required from the environment.',
  );
  forbidMatch(
    'compose-no-default-credentials',
    file,
    /postgrespassword|adminpassword|8f7b2c9a1d4e6f3a5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90/,
    'Committed fallback credentials are forbidden.',
  );
}
// scripts/prod-deploy.sh записывает реальные секреты в .env.production в корне
// репозитория, а Dockerfile выполняет `COPY . .`. Без исключения всего
// семейства .env* эти секреты попадают в слой production-образа.
requireMatch(
  'dockerignore-excludes-env-secrets',
  '.dockerignore',
  /^\.env\.\*$/m,
  'Docker build context must exclude the whole .env.* family, not individual variants.',
);
requireMatch(
  'dockerignore-keeps-env-templates',
  '.dockerignore',
  /^!\.env\.production\.example$/m,
  'Environment templates must stay available in the build context.',
);

requireMatch(
  'compose-dev-is-explicitly-development',
  'docker-compose.yml',
  /^# EMS Platform — LOCAL DEVELOPMENT ONLY$/m,
  'Development Compose file must retain its explicit warning banner.',
);
requireMatch(
  'compose-dev-is-explicitly-development',
  'docker-compose.yml',
  /NODE_ENV:\s*development/,
  'Development Compose file must set NODE_ENV=development.',
);

requireMatch(
  'reset-admin-requires-explicit-password',
  'packages/database/src/reset-admin.ts',
  /process\.env\.ADMIN_PASSWORD\s*\|\|\s*process\.argv\[2\]/,
  'Reset-admin must read a caller-supplied password.',
);
forbidMatch(
  'reset-admin-no-hardcoded-password',
  'packages/database/src/reset-admin.ts',
  /hashPassword\('admin123'\)/,
  'Reset-admin must not hash a hardcoded default password.',
);

const migrationPaths = [
  'apps/web/src/app/api/setup/execute/route.ts',
  'scripts/baremetal-install.sh',
  'scripts/baremetal-install.ps1',
  'scripts/ems-platform.service',
  'Dockerfile',
];
for (const file of migrationPaths) {
  requireMatch(
    'production-schema-uses-migrate-deploy',
    file,
    /migrate deploy/,
    'Production schema paths must run prisma migrate deploy.',
  );
  forbidMatch(
    'production-schema-forbids-destructive-db-push',
    file,
    /db push[^\n]*--accept-data-loss/,
    'Production schema paths must not run destructive db push.',
    executableLines,
  );
}

for (const file of ['Dockerfile', 'scripts/ems-platform.service']) {
  forbidMatch(
    'startup-does-not-suppress-migration-failure',
    file,
    /migrate deploy[^\n]*\|\|\s*(true|:)/,
    'Startup must not swallow migrate-deploy failure.',
    (source) => executableLines(source, /^\s*#/),
  );
  forbidMatch(
    'startup-does-not-ignore-execstartpre-failure',
    file,
    /^ExecStartPre=-/m,
    'Migration ExecStartPre must not ignore failures.',
    (source) => executableLines(source, /^\s*#/),
  );
}

requireMatch(
  'baseline-migration-lock-provider',
  'packages/database/prisma/migrations/migration_lock.toml',
  /provider\s*=\s*"postgresql"/,
  'Migration lock must declare PostgreSQL.',
);
const baselinePath = 'packages/database/prisma/migrations/20260831030000_init/migration.sql';
requireMatch(
  'baseline-migration-contains-user-table',
  baselinePath,
  /CREATE TABLE "User"/,
  'Baseline migration must create the User table.',
);
if (read(baselinePath).length <= 1000) {
  failures.push({
    policy: 'baseline-migration-is-complete',
    file: baselinePath,
    message: 'Baseline migration is unexpectedly small.',
  });
}

requireMatch(
  'setup-ui-empty-db-password',
  'apps/web/src/app/setup/page.tsx',
  /const \[dbPassword, setDbPassword\] = useState\(''\)/,
  'Setup UI must initialize the database password as empty.',
);
requireMatch(
  'setup-ui-empty-admin-password',
  'apps/web/src/app/setup/page.tsx',
  /const \[adminPassword, setAdminPassword\] = useState\(''\)/,
  'Setup UI must initialize the administrator password as empty.',
);
requireMatch(
  'setup-ui-empty-ldap-password',
  'apps/web/src/app/setup/page.tsx',
  /const \[ldapBindPassword, setLdapBindPassword\] = useState\(''\)/,
  'Setup UI must initialize the LDAP bind password as empty.',
);
forbidMatch(
  'setup-ui-no-default-passwords',
  'apps/web/src/app/setup/page.tsx',
  /useState\('(admin123|postgrespassword)'\)/,
  'Setup UI must not contain default passwords.',
);

requireMatch(
  'instrumentation-registers-env-validation',
  'apps/web/src/instrumentation.ts',
  /export\s+(async\s+)?function\s+register\s*\(/,
  'Next.js instrumentation must export register().',
);
requireMatch(
  'instrumentation-node-runtime-only',
  'apps/web/src/instrumentation.ts',
  /NEXT_RUNTIME\s*===\s*['"]nodejs['"]/,
  'Environment validation must run only in the Node.js runtime.',
);
requireMatch(
  'instrumentation-loads-env-validation',
  'apps/web/src/instrumentation.ts',
  /import\(['"]@\/lib\/env-validate['"]\)/,
  'Instrumentation must load the environment validator.',
);

if (failures.length > 0) {
  console.error('Static security policy check: FAIL');
  for (const failure of failures) {
    console.error(`  [${failure.policy}] ${failure.file}: ${failure.message}`);
  }
  process.exit(1);
}

console.log('Static security policy check: PASS');
