import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

const calls: string[] = [];
const user = { userId: 'admin-1', roles: ['admin'], permissions: [] };

mock.module('@ems/shared', { namedExports: { PERMISSIONS: { ADMIN_USERS_MANAGE: 'admin.users.manage', ADMIN_ROLES_MANAGE: 'admin.roles.manage' } } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => user,
    unauthorizedResponse: () => new Response(null, { status: 401 }),
    forbiddenResponse: () => new Response(null, { status: 403 }),
  },
});
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: () => true,
    logAuditEvent: async () => calls.push('audit'),
  },
});
mock.module('@ems/database', {
  namedExports: {
    prisma: {
      role: { findUnique: async () => ({ id: 'role-1', name: 'engineer', isSystem: false }) },
      permission: { findMany: async () => [{ id: 'perm-1', code: 'known.permission' }] },
      rolePermission: { deleteMany: async () => calls.push('rolePermission.deleteMany'), createMany: async () => calls.push('rolePermission.createMany') },
      userRole: {
        findUnique: async () => ({ userId: 'target-1', roleId: 'role-1' }),
        delete: async () => calls.push('userRole.delete'),
      },
      $transaction: async (callback: (tx: unknown) => unknown) => callback({
        permission: { findMany: async () => [{ id: 'perm-1', code: 'known.permission' }] },
        rolePermission: { deleteMany: async () => calls.push('rolePermission.deleteMany'), createMany: async () => calls.push('rolePermission.createMany') },
        role: { update: async () => ({ id: 'role-1' }) },
        userRole: { findUnique: async () => ({ userId: 'target-1', roleId: 'role-1' }), delete: async () => calls.push('userRole.delete') },
      }),
    },
  },
});

describe('EPS RBAC protective production handlers', () => {
  test('role PATCH performs permission replacement in a transaction', async () => {
    const { PATCH } = await import('../../app/api/admin/roles/[id]/route');
    const response = await PATCH(
      new Request('http://localhost/api/admin/roles/role-1', {
        method: 'PATCH',
        body: JSON.stringify({ permissionCodes: ['known.permission'] }),
        headers: { 'content-type': 'application/json' },
      }) as never,
      { params: { id: 'role-1' } },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(calls.slice(0, 2), ['rolePermission.deleteMany', 'rolePermission.createMany']);
  });

  test('revoke-by-ID deletes only the requested user-role link', async () => {
    calls.length = 0;
    const { DELETE } = await import('../../app/api/admin/users/[userId]/roles/[roleId]/route');
    const response = await DELETE(
      new Request('http://localhost/api/admin/users/target-1/roles/role-1', { method: 'DELETE' }) as never,
      { params: { userId: 'target-1', roleId: 'role-1' } },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(calls, ['userRole.delete', 'audit']);
  });
});
