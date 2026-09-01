import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';

let createCalls: unknown[] = [];
let createFailure: Error | null = null;

mock.module('@ems/database', {
  namedExports: {
    prisma: {
      auditLog: {
        create: async (args: unknown) => {
          createCalls.push(args);
          if (createFailure) throw createFailure;
          return { id: 'audit-1' };
        },
      },
    },
  },
});

let logAuditEvent: typeof import('./audit')['logAuditEvent'];

before(async () => {
  ({ logAuditEvent } = await import('./audit'));
});

beforeEach(() => {
  createCalls = [];
  createFailure = null;
});

describe('logAuditEvent', () => {
  test('persists the audit event with nullable optional fields normalized', async () => {
    await logAuditEvent({
      userId: undefined,
      action: 'UPDATE',
      entityType: 'Equipment',
      entityId: 'equipment-1',
      changes: { status: { old: 'DRAFT', new: 'APPROVED' } },
      ipAddress: undefined,
      userAgent: undefined,
    });

    assert.equal(createCalls.length, 1);
    assert.deepEqual(createCalls[0], {
      data: {
        userId: null,
        action: 'UPDATE',
        entityType: 'Equipment',
        entityId: 'equipment-1',
        changes: { status: { old: 'DRAFT', new: 'APPROVED' } },
        ipAddress: null,
        userAgent: null,
      },
    });
  });

  test('preserves explicit audit metadata and allows an absent changes payload', async () => {
    await logAuditEvent({
      userId: 'user-1',
      action: 'LOGIN',
      entityType: 'User',
      entityId: 'user-1',
      changes: undefined,
      ipAddress: '192.0.2.10',
      userAgent: 'EMS-Test/1.0',
    });

    assert.deepEqual(createCalls[0], {
      data: {
        userId: 'user-1',
        action: 'LOGIN',
        entityType: 'User',
        entityId: 'user-1',
        changes: undefined,
        ipAddress: '192.0.2.10',
        userAgent: 'EMS-Test/1.0',
      },
    });
  });

  test('does not throw when audit persistence fails', async () => {
    createFailure = new Error('postgres credentials must not escape');
    const originalConsoleError = console.error;
    const errors: unknown[] = [];
    console.error = (...args: unknown[]) => errors.push(args);

    try {
      await assert.doesNotReject(() => logAuditEvent({
        userId: 'user-1',
        action: 'DELETE',
        entityType: 'Equipment',
        entityId: 'equipment-1',
      }));
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(createCalls.length, 1);
    assert.equal(errors.length, 1);
    assert.equal(JSON.stringify(errors).includes('postgres credentials'), false);
    assert.equal(JSON.stringify(errors).includes('Error'), true);
  });
});
