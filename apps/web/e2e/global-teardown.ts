/**
 * global-teardown.ts — drops the ephemeral E2E database created by
 * global-setup.ts. Runs once after the whole E2E suite finishes.
 */
import { PrismaClient } from '@ems/database';
import { E2E_DB_NAME } from './global-setup';

function buildDatabaseUrl(dbName: string): string {
  const host = process.env.E2E_DB_HOST || 'localhost';
  const port = process.env.E2E_DB_PORT || '5432';
  const user = process.env.E2E_DB_USER || 'postgres';
  const password = process.env.E2E_DB_PASSWORD || 'postgres';
  return `postgresql://${user}:${password}@${host}:${port}/${dbName}?schema=public`;
}

async function globalTeardown(): Promise<void> {
  // Preserve the database for local debugging when explicitly requested.
  if (process.env.E2E_KEEP_DB === 'true') return;

  const adminClient = new PrismaClient({ datasources: { db: { url: buildDatabaseUrl('postgres') } } });
  try {
    // Playwright's webServer (next start) holds an open Prisma connection
    // pool to this database for the whole run. Terminate those backend
    // sessions first, or DROP DATABASE fails with "is being accessed by
    // other users" (Postgres error 55006) even after all tests finished.
    await adminClient.$executeRawUnsafe(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${E2E_DB_NAME}' AND pid <> pg_backend_pid()`
    );
    await adminClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${E2E_DB_NAME}`);
  } finally {
    await adminClient.$disconnect();
  }
}

export default globalTeardown;
