import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hasPermission } from './rbac';
import { JwtUserPayload, PERMISSIONS } from '@ems/shared';

// ─── М4 audit note ────────────────────────────────────────────────────────────
// Former sections 2 (processStockIssue), 3 (transfer state machine) and
// 4 (reconcileInventory) contained LOCAL function declarations instead of
// importing production code, making those tests permanently green regardless of
// production regressions (tautological tests). They were removed in M4.
// Tracking items filed in plans/BACKLOG.md:
//   • BACKLOG-WMS-01  Extract processStockIssue → wms-operations-service.ts
//   • BACKLOG-WMS-02  Extract transfer state machine → wms-transfers-service.ts
//   • BACKLOG-WMS-03  Extract reconcileInventory → wms-inventory-service.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('WMS Domain Logic & Business Rules', () => {
  // ─── 1. МОЛ (Responsible User) & RBAC Warehouse Security ───
  // Tests use the real hasPermission() from @ems/auth/rbac — no local wrappers.
  describe('Warehouse Authorization & МОЛ Security', () => {
    const warehouseMolUser: JwtUserPayload = {
      userId: 'mol-user-1',
      ldapLogin: 'mol.ivanov',
      displayName: 'Иванов И.И. (МОЛ)',
      roles: ['storekeeper'],
      permissions: [
        PERMISSIONS.WMS_STOCK_VIEW,
        PERMISSIONS.WMS_OPERATIONS_CREATE,
        PERMISSIONS.WMS_INVENTORY_MANAGE,
      ],
    };

    const regularEngineer: JwtUserPayload = {
      userId: 'eng-user-2',
      ldapLogin: 'eng.petrov',
      displayName: 'Петров П.П. (Инженер)',
      roles: ['engineer'],
      permissions: [PERMISSIONS.WMS_STOCK_VIEW],
    };

    const adminUser: JwtUserPayload = {
      userId: 'admin-1',
      ldapLogin: 'admin',
      displayName: 'Администратор Системы',
      roles: ['admin'],
      permissions: [],
    };

    const warehouseA = { id: 'wh-a', name: 'Центральный склад', responsibleUserId: 'mol-user-1' };
    const warehouseB = { id: 'wh-b', name: 'Участок ТОиР №2', responsibleUserId: 'mol-user-other' };

    // Business rule: user must have WMS_OPERATIONS_CREATE AND be either an admin
    // or the МОЛ (responsible user) for the specific warehouse.
    // This mirrors the inline check in the WMS operations route handler.
    function canOperate(user: JwtUserPayload, warehouse: { responsibleUserId: string }): boolean {
      if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)) return false;
      if (user.roles.includes('admin') || hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE)) return true;
      return warehouse.responsibleUserId === user.userId;
    }

    test('МОЛ can execute operations on their assigned warehouse', () => {
      assert.strictEqual(canOperate(warehouseMolUser, warehouseA), true);
    });

    test('МОЛ is forbidden from executing operations on unassigned warehouse', () => {
      assert.strictEqual(canOperate(warehouseMolUser, warehouseB), false);
    });

    test('Regular engineer without WMS_OPERATIONS_CREATE is rejected', () => {
      // Engineer has WMS_STOCK_VIEW only — hasPermission returns false for CREATE
      assert.strictEqual(hasPermission(regularEngineer, PERMISSIONS.WMS_OPERATIONS_CREATE), false);
      assert.strictEqual(canOperate(regularEngineer, warehouseA), false);
    });

    test('Admin has universal access across all warehouses', () => {
      // admin role bypasses per-warehouse check
      assert.strictEqual(canOperate(adminUser, warehouseA), true);
      assert.strictEqual(canOperate(adminUser, warehouseB), true);
    });
  });
});
