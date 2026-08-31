import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hasPermission } from './rbac';
import { JwtUserPayload, PERMISSIONS } from '@ems/shared';

// ─── М4 audit note ────────────────────────────────────────────────────────────
// Former sections 2 (calculateScheduleHealth) and 3 (validateChecklistCompletion)
// contained LOCAL function declarations that duplicated production logic, making
// those tests permanently green regardless of production regressions (tautological).
// They were removed in M4. Backlog items filed:
//   • BACKLOG-MRO-01  Extract calculateScheduleHealth → mro-schedule-service.ts
//   • BACKLOG-MRO-02  Extract validateChecklistCompletion → mro-execution-service.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('MRO Domain Logic, Maintenance Schedules & Checklists', () => {
  // ─── 1. RBAC & Security for MRO Module ───
  // Tests call the real hasPermission() from @ems/auth/rbac — no local wrappers.
  describe('MRO Role-Based Access Control', () => {
    const technicianUser: JwtUserPayload = {
      userId: 'tech-1',
      ldapLogin: 'technician.smirnov',
      displayName: 'Смирнов С.С. (Техник)',
      roles: ['technician'],
      permissions: [PERMISSIONS.MRO_SCHEDULE_VIEW, PERMISSIONS.MRO_EXECUTION_COMPLETE],
    };

    const chiefMechanicUser: JwtUserPayload = {
      userId: 'mech-1',
      ldapLogin: 'mechanic.kuznetsov',
      displayName: 'Кузнецов К.К. (Главный механик)',
      roles: ['chief_mechanic'],
      permissions: [
        PERMISSIONS.MRO_SCHEDULE_VIEW,
        PERMISSIONS.MRO_SCHEDULE_MANAGE,
        PERMISSIONS.MRO_EXECUTION_COMPLETE,
      ],
    };

    test('Technician can view and complete executions but cannot manage maintenance schedules', () => {
      assert.strictEqual(hasPermission(technicianUser, PERMISSIONS.MRO_SCHEDULE_VIEW), true);
      assert.strictEqual(hasPermission(technicianUser, PERMISSIONS.MRO_EXECUTION_COMPLETE), true);
      assert.strictEqual(hasPermission(technicianUser, PERMISSIONS.MRO_SCHEDULE_MANAGE), false);
    });

    test('Chief mechanic has full management over schedules and execution', () => {
      assert.strictEqual(hasPermission(chiefMechanicUser, PERMISSIONS.MRO_SCHEDULE_VIEW), true);
      assert.strictEqual(hasPermission(chiefMechanicUser, PERMISSIONS.MRO_SCHEDULE_MANAGE), true);
      assert.strictEqual(hasPermission(chiefMechanicUser, PERMISSIONS.MRO_EXECUTION_COMPLETE), true);
    });
  });
});
