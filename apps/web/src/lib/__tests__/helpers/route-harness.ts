/**
 * Shared utilities for executable Next.js API route tests.
 *
 * Tests register mock.module() calls in their own file before dynamically
 * importing a route. The Prisma mock deliberately uses broad unknown return
 * contracts so each suite can replace methods with route-specific fixtures.
 */
import type { NextRequest } from 'next/server';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';

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

export interface MakeRequestOptions {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
  formData?: FormData;
}

export function makeRequest(options: MakeRequestOptions = {}): NextRequest {
  const method = options.method ?? 'GET';
  const url = new URL(options.url ?? 'http://localhost:3000/api/test');
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const headers = new Headers(options.headers ?? {});
  const bodyText = options.body !== undefined ? JSON.stringify(options.body) : undefined;
  if (bodyText) headers.set('content-type', 'application/json');

  return {
    method,
    url: url.toString(),
    headers,
    json: async () => options.body,
    text: async () => bodyText ?? '',
    formData: async () => options.formData ?? new FormData(),
    nextUrl: url,
  } as unknown as NextRequest;
}

export interface RouteResponse {
  status: number;
  json: () => Promise<unknown>;
}

type UnknownRecord = Record<string, unknown>;
type TransactionCallback = (transaction: ReturnType<typeof makePrismaMock>) => Promise<unknown>;

const emptyList = async (): Promise<UnknownRecord[]> => [];
const emptyCount = async (): Promise<number> => 0;
const missing = async (): Promise<UnknownRecord | null> => null;

export function makePrismaMock() {
  let connectionAttempts = 0;

  const mock = {
    _connectionAttempts: () => connectionAttempts,
    $connect: async () => {
      connectionAttempts += 1;
      throw new Error('Route unit tests must not connect to PostgreSQL');
    },
    $transaction: async (callback: TransactionCallback) => callback(mock),

    equipment: {
      count: emptyCount,
      findMany: emptyList,
      groupBy: emptyList,
      findFirst: missing,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'equipment-id', name: 'Equipment', status: 'DRAFT', tags: [] }),
      update: async (): Promise<UnknownRecord> => ({ id: 'equipment-id', name: 'Equipment', status: 'DRAFT', tags: [] }),
      delete: async (): Promise<UnknownRecord> => ({ id: 'equipment-id' }),
    },
    equipmentTag: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async () => ({ count: 0 }),
    },
    equipmentApproval: {
      count: emptyCount,
      findMany: emptyList,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'approval-id' }),
      update: async (): Promise<UnknownRecord> => ({ id: 'approval-id' }),
    },
    equipmentDocument: {
      count: emptyCount,
      findMany: emptyList,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'document-id' }),
      update: async (): Promise<UnknownRecord> => ({ id: 'document-id' }),
      delete: async (): Promise<UnknownRecord> => ({ id: 'document-id' }),
    },
    document: {
      count: emptyCount,
      findMany: emptyList,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'document-id' }),
      update: async (): Promise<UnknownRecord> => ({ id: 'document-id' }),
      delete: async (): Promise<UnknownRecord> => ({ id: 'document-id' }),
    },
    tag: {
      findMany: emptyList,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'tag-id' }),
      upsert: async (): Promise<UnknownRecord> => ({ id: 'tag-id', name: 'Tag' }),
    },
    jiraIssueCache: {
      count: emptyCount,
      findMany: emptyList,
      upsert: async (): Promise<UnknownRecord> => ({ issueKey: 'TEST-1' }),
    },
    srmIssue: {
      findMany: emptyList,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'issue-id' }),
    },
    permission: {
      findMany: emptyList,
      findUnique: missing,
      upsert: async (): Promise<UnknownRecord> => ({ id: 'permission-id' }),
    },
    role: {
      findMany: emptyList,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'role-id' }),
      update: async (): Promise<UnknownRecord> => ({ id: 'role-id' }),
      delete: async (): Promise<UnknownRecord> => ({ id: 'role-id' }),
    },
    rolePermission: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async () => ({ count: 0 }),
    },
    systemSetting: {
      findMany: emptyList,
      findUnique: missing,
      upsert: async (): Promise<UnknownRecord> => ({ id: 'setting-id' }),
    },
    notification: {
      update: async (): Promise<UnknownRecord> => ({ id: 'notification-id' }),
      updateMany: async () => ({ count: 0 }),
    },
    stockTransfer: {
      count: emptyCount,
      findMany: emptyList,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'created-id' }),
      update: async (): Promise<UnknownRecord> => ({ id: 'updated-id' }),
    },
    stockOperation: {
      count: emptyCount,
      findMany: emptyList,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'created-id' }),
    },
    warehouse: { findMany: emptyList, findUnique: missing },
    user: {
      findFirst: missing,
      findUnique: missing,
      create: async (): Promise<UnknownRecord> => ({ id: 'user-id', ldapLogin: 'user', displayName: 'User' }),
      update: async (): Promise<UnknownRecord> => ({ id: 'user-id' }),
    },
    auditLog: { create: async (): Promise<UnknownRecord> => ({}) },
  };

  return mock;
}
