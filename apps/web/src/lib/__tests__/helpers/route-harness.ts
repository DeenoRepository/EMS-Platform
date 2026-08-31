/**
 * Route test harness — shared utilities for testing Next.js API route handlers.
 *
 * Pattern:
 *   1. Call `mock.module(...)` for every external dependency before any import.
 *   2. In `before()`, dynamically import the route module and any helpers.
 *   3. Construct requests with `makeRequest()`.
 *   4. Assert on `response.status` and `response.json()`.
 *
 * This module is a pure helper; it does not call mock.module() itself because
 * mock.module() must be called in the file that runs the tests (the mock
 * registry is per-test-file).  See auth-guard.test.ts for the canonical usage.
 *
 * TSX_TSCONFIG_PATH=apps/web/tsconfig.json must be set so that @/ path aliases
 * resolve. The test-runner.mjs sets this automatically since M1+M3.
 */
import type { NextRequest } from 'next/server';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';

// ── Canonical test users ─────────────────────────────────────────────────────

export const adminUser: JwtUserPayload = {
  userId: 'admin-test-id',
  ldapLogin: 'admin',
  displayName: 'Test Admin',
  roles: ['admin'],
  permissions: Object.values(PERMISSIONS),
};

export const wmsUser: JwtUserPayload = {
  userId: 'wms-user-test-id',
  ldapLogin: 'wms.user',
  displayName: 'WMS User',
  roles: ['storekeeper'],
  permissions: [
    PERMISSIONS.WMS_STOCK_VIEW,
    PERMISSIONS.WMS_OPERATIONS_CREATE,
    PERMISSIONS.WMS_WAREHOUSES_MANAGE,
  ],
};

export const viewOnlyUser: JwtUserPayload = {
  userId: 'view-only-test-id',
  ldapLogin: 'viewer',
  displayName: 'View Only',
  roles: ['viewer'],
  permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW],
};

// ── Request factory ──────────────────────────────────────────────────────────

export interface MakeRequestOptions {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/**
 * Build a minimal NextRequest-shaped object without importing next/server
 * at the top level (which would require a full Next.js environment).
 * Sufficient for route handlers that read method, url, headers, and json().
 */
export function makeRequest(opts: MakeRequestOptions = {}): NextRequest {
  const method = opts.method ?? 'GET';
  const base = opts.url ?? 'http://localhost:3000/api/test';
  const url = new URL(base);

  if (opts.searchParams) {
    for (const [k, v] of Object.entries(opts.searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const headers = new Headers(opts.headers ?? {});
  const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  if (bodyStr) headers.set('content-type', 'application/json');

  return {
    method,
    url: url.toString(),
    headers,
    json: async () => (opts.body !== undefined ? opts.body : undefined),
    text: async () => bodyStr ?? '',
    nextUrl: url,
  } as unknown as NextRequest;
}

/**
 * Minimal NextResponse.json-compatible object returned by route handlers.
 * Real Next.js returns a Response subclass; we only need status + json().
 */
export interface RouteResponse {
  status: number;
  json: () => Promise<unknown>;
}

// ── Prisma mock factory ──────────────────────────────────────────────────────

/**
 * Returns a Prisma mock that counts $connect attempts (they should be 0) and
 * stubs every model with empty implementations. Override individual methods in
 * the returned object to inject test data.
 */
export function makePrismaMock() {
  let connectionAttempts = 0;

  const mock = {
    _connectionAttempts: () => connectionAttempts,
    $connect: async () => {
      connectionAttempts += 1;
      throw new Error('Route unit tests must not connect to PostgreSQL');
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(mock),
    // Models — add stubs as needed; tests override per-assertion
    stockTransfer: {
      count: async (): Promise<number> => 0,
      findMany: async (): Promise<unknown[]> => [],
      findUnique: async (): Promise<unknown> => null,
      create: async (): Promise<unknown> => ({ id: 'created-id' }),
      update: async (): Promise<unknown> => ({ id: 'updated-id' }),
    },
    stockOperation: {
      count: async (): Promise<number> => 0,
      findMany: async (): Promise<unknown[]> => [],
      findUnique: async (): Promise<unknown> => null,
      create: async (): Promise<unknown> => ({ id: 'created-id' }),
    },
    warehouse: {
      findMany: async () => [],
      findUnique: async () => null,
    },
    user: {
      findFirst: async () => null,
      findUnique: async () => null,
      create: async () => ({ id: 'user-id', ldapLogin: 'user', displayName: 'User' }),
      update: async () => ({ id: 'user-id' }),
    },
    role: {
      findUnique: async () => null,
    },
    systemSetting: {
      findMany: async () => [],
      findUnique: async () => null,
    },
    auditLog: {
      create: async () => ({}),
    },
  };

  return mock;
}
