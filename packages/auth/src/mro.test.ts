import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hasPermission, hasAnyPermission } from './rbac';
import { JwtUserPayload, PERMISSIONS } from '@ems/shared';

describe('MRO Domain Logic, Maintenance Schedules & Checklists', () => {
  // ─── 1. RBAC & Security for MRO Module ───
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

  // ─── 2. Maintenance Status & Overdue Calculation Engine ───
  describe('Maintenance Schedule Overdue & State Calculations', () => {
    function calculateScheduleHealth(scheduledDate: Date, status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'): {
      isOverdue: boolean;
      daysRemaining: number;
      badgeColor: 'error' | 'warning' | 'info' | 'success';
    } {
      const now = new Date();
      const diffMs = scheduledDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (status === 'COMPLETED') {
        return { isOverdue: false, daysRemaining, badgeColor: 'success' };
      }

      if (status === 'CANCELLED') {
        return { isOverdue: false, daysRemaining, badgeColor: 'info' };
      }

      if (daysRemaining < 0) {
        return { isOverdue: true, daysRemaining, badgeColor: 'error' };
      }

      if (daysRemaining <= 3) {
        return { isOverdue: false, daysRemaining, badgeColor: 'warning' };
      }

      return { isOverdue: false, daysRemaining, badgeColor: 'info' };
    }

    test('Identifies past due maintenance as overdue with error state', () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const result = calculateScheduleHealth(pastDate, 'PLANNED');
      assert.strictEqual(result.isOverdue, true);
      assert.strictEqual(result.badgeColor, 'error');
      assert.ok(result.daysRemaining < 0);
    });

    test('Identifies upcoming maintenance within 3 days as warning state', () => {
      const soonDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days later
      const result = calculateScheduleHealth(soonDate, 'PLANNED');
      assert.strictEqual(result.isOverdue, false);
      assert.strictEqual(result.badgeColor, 'warning');
    });

    test('Completed maintenance is never overdue and has success state', () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const result = calculateScheduleHealth(pastDate, 'COMPLETED');
      assert.strictEqual(result.isOverdue, false);
      assert.strictEqual(result.badgeColor, 'success');
    });
  });

  // ─── 3. Checklist Validation & Mandatory Items Guard ───
  describe('Maintenance Checklist Verification', () => {
    interface ChecklistItem {
      id: string;
      title: string;
      isRequired: boolean;
      checked: boolean;
      comment?: string;
    }

    function validateChecklistCompletion(items: ChecklistItem[]): {
      canComplete: boolean;
      missingRequiredItems: string[];
      completionPercentage: number;
    } {
      const requiredMissing = items.filter((item) => item.isRequired && !item.checked);
      const totalChecked = items.filter((item) => item.checked).length;
      const completionPercentage = items.length > 0 ? Math.round((totalChecked / items.length) * 100) : 100;

      return {
        canComplete: requiredMissing.length === 0,
        missingRequiredItems: requiredMissing.map((i) => i.title),
        completionPercentage,
      };
    }

    test('Allows completing maintenance when all required checklist items are checked', () => {
      const checklist: ChecklistItem[] = [
        { id: '1', title: 'Проверка уровня масла', isRequired: true, checked: true },
        { id: '2', title: 'Затяжка болтовых соединений', isRequired: true, checked: true },
        { id: '3', title: 'Очистка корпуса от пыли', isRequired: false, checked: false },
      ];

      const validation = validateChecklistCompletion(checklist);
      assert.strictEqual(validation.canComplete, true);
      assert.strictEqual(validation.missingRequiredItems.length, 0);
      assert.strictEqual(validation.completionPercentage, 67);
    });

    test('Rejects completing maintenance if mandatory item is not checked', () => {
      const checklist: ChecklistItem[] = [
        { id: '1', title: 'Проверка заземления', isRequired: true, checked: false },
        { id: '2', title: 'Проверка давления в контуре', isRequired: true, checked: true },
      ];

      const validation = validateChecklistCompletion(checklist);
      assert.strictEqual(validation.canComplete, false);
      assert.deepStrictEqual(validation.missingRequiredItems, ['Проверка заземления']);
      assert.strictEqual(validation.completionPercentage, 50);
    });
  });
});
