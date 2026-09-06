import { test, describe } from 'node:test';
import assert from 'node:assert';
import { EquipmentStatus, ApprovalStatus, ApprovalType } from '@ems/database';
import { resolveApprovalDecision, EquipmentEntity, ApprovalEntity } from './domain/lifecycle-engine';
import { matchImportColumn, resolveInventoryNumber, sanitizeImportRow } from './domain/import-engine';
import { sanitizeFilename, validateFileUploadPreconditions } from './domain/file-storage-engine';

describe('Modular EPS Domain Package (@ems/eps)', () => {
  // ─── 1. Lifecycle Engine ───
  describe('Lifecycle Engine & Approval Resolutions', () => {
    test('Approving COMMISSIONING transitions equipment to ACTIVE', () => {
      const eq: EquipmentEntity = { id: 'eq-1', name: 'Станок', status: EquipmentStatus.DRAFT };
      const appr: ApprovalEntity = { id: 'appr-1', equipmentId: 'eq-1', type: ApprovalType.COMMISSIONING, status: ApprovalStatus.PENDING };

      const res = resolveApprovalDecision(eq, appr, 'APPROVE');
      assert.strictEqual(res.updatedEquipment.status, EquipmentStatus.ACTIVE);
      assert.strictEqual(res.resolvedApprovalStatus, ApprovalStatus.APPROVED);
    });

    test('Approving DECOMMISSIONING transitions equipment to DECOMMISSIONED', () => {
      const eq: EquipmentEntity = { id: 'eq-2', name: 'Пресс', status: EquipmentStatus.ACTIVE };
      const appr: ApprovalEntity = { id: 'appr-2', equipmentId: 'eq-2', type: ApprovalType.DECOMMISSIONING, status: ApprovalStatus.PENDING };

      const res = resolveApprovalDecision(eq, appr, 'APPROVE');
      assert.strictEqual(res.updatedEquipment.status, EquipmentStatus.DECOMMISSIONED);
      assert.strictEqual(res.resolvedApprovalStatus, ApprovalStatus.APPROVED);
    });

    test('Rejecting leaves status intact and records rejection message', () => {
      const eq: EquipmentEntity = { id: 'eq-3', name: 'Компрессор', status: EquipmentStatus.DRAFT };
      const appr: ApprovalEntity = { id: 'appr-3', equipmentId: 'eq-3', type: ApprovalType.COMMISSIONING, status: ApprovalStatus.PENDING };

      const res = resolveApprovalDecision(eq, appr, 'REJECT', 'Неполная документация');
      assert.strictEqual(res.updatedEquipment.status, EquipmentStatus.DRAFT);
      assert.strictEqual(res.resolvedApprovalStatus, ApprovalStatus.REJECTED);
      assert.ok(res.notificationMessage.includes('Неполная документация'));
    });
  });

  // ─── 2. Import Engine ───
  describe('Import Engine', () => {
    test('Matches aliases correctly', () => {
      assert.strictEqual(matchImportColumn('Инвентарный № [обязательно]'), 'inventoryNumber');
      assert.strictEqual(matchImportColumn('Модель / модификация'), 'model');
      assert.strictEqual(matchImportColumn('Место установки'), 'location');
    });

    test('Resolves duplicates with DUP- prefix and temp numbers with TEMP-PAA-XXXX', () => {
      const existing = new Set(['18275']);
      const dup = resolveInventoryNumber('18275', existing, 1);
      assert.strictEqual(dup.finalInventoryNumber, 'DUP-18275');
      assert.strictEqual(dup.isDuplicate, true);

      const temp = resolveInventoryNumber('', existing, 7);
      assert.strictEqual(temp.finalInventoryNumber, 'TEMP-PAA-0007');
      assert.strictEqual(temp.isTemporary, true);
    });

    test('Sanitizes serialNumber on TEMP-PAA rows', () => {
      const cleaned = sanitizeImportRow({ inventoryNumber: 'TEMP-PAA-0001', serialNumber: 'TEST_SN' });
      assert.strictEqual(cleaned.serialNumber, null);
    });
  });

  // ─── 3. File Storage Engine ───
  describe('File Storage Engine', () => {
    test('Sanitizes path traversal and validates extensions', () => {
      const clean = sanitizeFilename('../../secret/drawing.dwg');
      assert.strictEqual(clean, 'drawing.dwg');
      assert.strictEqual(validateFileUploadPreconditions('drawing.dwg', 'document', 1024), true);
      assert.throws(() => validateFileUploadPreconditions('script.exe', 'document', 1024), /Недопустимое расширение/);
    });
  });
});
