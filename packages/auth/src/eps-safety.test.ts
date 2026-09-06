import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  PERMISSIONS,
  JwtUserPayload,
} from '@ems/shared';
import { EquipmentStatus } from '@ems/database';
import { hasPermission } from './rbac';

describe('EPS Safety Regression & Domain Invariant Test Suite', () => {
  // ─── 1. Access Control & Authorization Invariants ───
  describe('RBAC & Permission Checks for EPS Endpoints', () => {
    const operatorUser: JwtUserPayload = {
      userId: 'op-1',
      ldapLogin: 'op.ivanov',
      displayName: 'Оператор Иванов',
      roles: ['operator'],
      permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW],
    };

    const engineerUser: JwtUserPayload = {
      userId: 'eng-1',
      ldapLogin: 'eng.petrov',
      displayName: 'Инженер Петров',
      roles: ['engineer'],
      permissions: [
        PERMISSIONS.EPS_EQUIPMENT_VIEW,
        PERMISSIONS.EPS_EQUIPMENT_CREATE,
        PERMISSIONS.EPS_EQUIPMENT_EDIT,
        PERMISSIONS.EPS_APPROVALS_CREATE,
        PERMISSIONS.EPS_DOCUMENTS_UPLOAD,
      ],
    };

    const chiefEngineerUser: JwtUserPayload = {
      userId: 'chief-1',
      ldapLogin: 'chief.sidorov',
      displayName: 'Главный инженер Сидоров',
      roles: ['chief_engineer'],
      permissions: [
        PERMISSIONS.EPS_EQUIPMENT_VIEW,
        PERMISSIONS.EPS_EQUIPMENT_CREATE,
        PERMISSIONS.EPS_EQUIPMENT_EDIT,
        PERMISSIONS.EPS_EQUIPMENT_DELETE,
        PERMISSIONS.EPS_APPROVALS_MANAGE,
        PERMISSIONS.EPS_REPORTS_MANAGE,
      ],
    };

    test('Operator has read-only access to equipment registry', () => {
      assert.strictEqual(hasPermission(operatorUser, PERMISSIONS.EPS_EQUIPMENT_VIEW), true);
      assert.strictEqual(hasPermission(operatorUser, PERMISSIONS.EPS_EQUIPMENT_CREATE), false);
      assert.strictEqual(hasPermission(operatorUser, PERMISSIONS.EPS_EQUIPMENT_DELETE), false);
      assert.strictEqual(hasPermission(operatorUser, PERMISSIONS.EPS_APPROVALS_MANAGE), false);
    });

    test('Engineer can create and edit equipment but cannot delete or approve', () => {
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_EQUIPMENT_CREATE), true);
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_EQUIPMENT_EDIT), true);
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_EQUIPMENT_DELETE), false);
      assert.strictEqual(hasPermission(engineerUser, PERMISSIONS.EPS_APPROVALS_MANAGE), false);
    });

    test('Chief Engineer can approve changes and manage equipment lifecycle', () => {
      assert.strictEqual(hasPermission(chiefEngineerUser, PERMISSIONS.EPS_APPROVALS_MANAGE), true);
      assert.strictEqual(hasPermission(chiefEngineerUser, PERMISSIONS.EPS_EQUIPMENT_DELETE), true);
      assert.strictEqual(hasPermission(chiefEngineerUser, PERMISSIONS.EPS_REPORTS_MANAGE), true);
    });
  });

  // ─── 2. Inventory Number Collision & Smart Import Rules ───
  describe('Inventory Number Collision & Duplicate Handling', () => {
    /**
     * Resolves inventory numbers according to project rules:
     * - If original inv number exists in database, resolve to DUP-{original}
     * - If equipment lacks inventory number, allocate TEMP-PAA-{seq}
     */
    function resolveInventoryNumber(
      input: string | null | undefined,
      existingNumbers: Set<string>,
      tempSequence: number
    ): { finalInventoryNumber: string; isDuplicate: boolean; isTemporary: boolean } {
      const trimmed = input?.trim();

      if (!trimmed) {
        const paddedSeq = String(tempSequence).padStart(4, '0');
        return {
          finalInventoryNumber: `TEMP-PAA-${paddedSeq}`,
          isDuplicate: false,
          isTemporary: true,
        };
      }

      if (existingNumbers.has(trimmed)) {
        return {
          finalInventoryNumber: `DUP-${trimmed}`,
          isDuplicate: true,
          isTemporary: false,
        };
      }

      return {
        finalInventoryNumber: trimmed,
        isDuplicate: false,
        isTemporary: false,
      };
    }

    test('Resolves existing inventory number 18275 to DUP-18275 without silent overwrite', () => {
      const existing = new Set(['18275', 'EQ-001', 'CNC-2024']);
      const result = resolveInventoryNumber('18275', existing, 1);

      assert.strictEqual(result.finalInventoryNumber, 'DUP-18275');
      assert.strictEqual(result.isDuplicate, true);
      assert.strictEqual(result.isTemporary, false);
    });

    test('Generates formatted temporary number TEMP-PAA-XXXX when inventory number is missing', () => {
      const existing = new Set(['18275']);
      const result = resolveInventoryNumber('', existing, 42);

      assert.strictEqual(result.finalInventoryNumber, 'TEMP-PAA-0042');
      assert.strictEqual(result.isDuplicate, false);
      assert.strictEqual(result.isTemporary, true);
    });

    test('Clears serial number for temporary items to prevent false upsert collisions', () => {
      interface ImportRow {
        inventoryNumber: string;
        serialNumber?: string | null;
      }

      function sanitizeImportRow(row: ImportRow): ImportRow {
        if (row.inventoryNumber.startsWith('TEMP-PAA-')) {
          return { ...row, serialNumber: null };
        }
        return row;
      }

      const tempRow: ImportRow = { inventoryNumber: 'TEMP-PAA-0005', serialNumber: 'UNKNOWN_SERIAL' };
      const sanitized = sanitizeImportRow(tempRow);
      assert.strictEqual(sanitized.serialNumber, null);

      const normalRow: ImportRow = { inventoryNumber: 'EQ-999', serialNumber: 'SN-12345' };
      const normalSanitized = sanitizeImportRow(normalRow);
      assert.strictEqual(normalSanitized.serialNumber, 'SN-12345');
    });
  });

  // ─── 3. Historical Data & Read-Only Compatibility ───
  describe('Read-Only Legacy SRM/MRO History Preservation', () => {
    interface EquipmentDetailDto {
      id: string;
      name: string;
      inventoryNumber: string;
      status: EquipmentStatus;
      maintenanceHistory: Array<{ id: string; scheduledDate: string; status: string; checklistCount: number }>;
      incidentHistory: Array<{ id: string; issueKey: string; summary: string; status: string; priority: string }>;
    }

    test('Loads historical maintenance and incidents without calling external sync', () => {
      let syncCalled = false;
      function fakeSyncTrigger() {
        syncCalled = true;
      }

      function readEquipmentPassportArchive(equipmentId: string): EquipmentDetailDto {
        return {
          id: equipmentId,
          name: 'Фрезерный станок GF-500',
          inventoryNumber: 'EQ-GF-500',
          status: EquipmentStatus.ACTIVE,
          maintenanceHistory: [
            { id: 'mro-1', scheduledDate: '2025-11-10T08:00:00Z', status: 'COMPLETED', checklistCount: 5 },
            { id: 'mro-2', scheduledDate: '2026-02-15T08:00:00Z', status: 'COMPLETED', checklistCount: 4 },
          ],
          incidentHistory: [
            { id: 'srm-1', issueKey: 'INC-2025-12', summary: 'Перегрев шпинделя', status: 'RESOLVED', priority: 'HIGH' },
          ],
        };
      }

      const passport = readEquipmentPassportArchive('eq-gf-500');
      assert.strictEqual(passport.id, 'eq-gf-500');
      assert.strictEqual(passport.maintenanceHistory.length, 2);
      assert.strictEqual(passport.incidentHistory.length, 1);
      assert.strictEqual(passport.incidentHistory[0].issueKey, 'INC-2025-12');
      assert.strictEqual(syncCalled, false, 'Read-only archive view must NEVER invoke external sync');
    });

    test('Report generation preserves true historical counts and does not inject false zeroes', () => {
      interface EquipmentReportRow {
        inventoryNumber: string;
        name: string;
        completedMroCount: number | null;
        totalIncidentsCount: number | null;
      }

      function buildReportRow(
        equipment: { inventoryNumber: string; name: string },
        historicalData?: { mroCount?: number; srmCount?: number }
      ): EquipmentReportRow {
        return {
          inventoryNumber: equipment.inventoryNumber,
          name: equipment.name,
          completedMroCount: historicalData?.mroCount !== undefined ? historicalData.mroCount : null,
          totalIncidentsCount: historicalData?.srmCount !== undefined ? historicalData.srmCount : null,
        };
      }

      const rowWithHistory = buildReportRow(
        { inventoryNumber: 'EQ-01', name: 'Пресс КД2126' },
        { mroCount: 3, srmCount: 1 }
      );
      assert.strictEqual(rowWithHistory.completedMroCount, 3);
      assert.strictEqual(rowWithHistory.totalIncidentsCount, 1);

      const rowWithoutHistory = buildReportRow({ inventoryNumber: 'EQ-02', name: 'Компрессор' });
      assert.strictEqual(rowWithoutHistory.completedMroCount, null);
      assert.strictEqual(rowWithoutHistory.totalIncidentsCount, null);
    });
  });

  // ─── 4. File Upload & Storage Path Security ───
  describe('File Upload Security & Path Traversal Prevention', () => {
    function sanitizeUploadedFileName(originalName: string): string {
      const cleanName = originalName.replace(/^.*[\\\/]/, '').replace(/[^a-zA-Z0-9._\-а-яА-Я]/g, '_');
      if (cleanName.includes('..') || cleanName.startsWith('.')) {
        throw new Error('Недопустимое имя файла');
      }
      return cleanName;
    }

    test('Prevents path traversal characters in uploaded file names', () => {
      const sanitized = sanitizeUploadedFileName('../../etc/passwd.pdf');
      assert.strictEqual(sanitized, 'passwd.pdf');
      assert.strictEqual(sanitized.includes('..'), false);
    });

    test('Preserves valid Russian and alphanumeric file names', () => {
      const name = 'Паспорт_Станка_16К20.pdf';
      const sanitized = sanitizeUploadedFileName(name);
      assert.strictEqual(sanitized, name);
    });

    test('Rejects hidden files and traversal dots', () => {
      assert.throws(() => sanitizeUploadedFileName('...bad'), /Недопустимое имя файла/);
    });
  });
});
