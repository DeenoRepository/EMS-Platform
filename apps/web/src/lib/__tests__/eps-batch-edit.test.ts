import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getEquipmentColumnValue,
  computeReplacement,
  extractDistinctColumnValues,
  prepareEquipmentFieldUpdate,
  BATCH_EDIT_COLUMNS,
} from '../eps-batch-edit';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

describe('EPS Batch Edit: Field Extraction & Logic', () => {
  const sampleEquipment = [
    {
      id: 'eq-1',
      name: 'Пресс гидравлический П-100',
      inventoryNumber: 'INV-001',
      manufacturer: 'Сименс',
      model: 'H-100',
      location: 'Цех №1',
      status: 'ACTIVE',
      customFields: {
        department: 'Механический участок',
        criticality: 'A',
      },
    },
    {
      id: 'eq-2',
      name: 'Пресс гидравлический П-200',
      inventoryNumber: 'INV-002',
      manufacturer: 'Сименс',
      model: 'H-200',
      location: 'Цех №1',
      status: 'ACTIVE',
      customFields: {
        department: 'Механический участок',
        criticality: 'A',
      },
    },
    {
      id: 'eq-3',
      name: 'Станок фрезерный СФ-15',
      inventoryNumber: 'INV-003',
      manufacturer: 'Siemens AG',
      model: 'SF-15',
      location: 'Цех №2',
      status: 'UNDER_REPAIR',
      customFields: {
        department: 'Сборочный участок',
        criticality: 'B',
      },
    },
  ];

  it('correctly extracts direct column values', () => {
    assert.strictEqual(getEquipmentColumnValue(sampleEquipment[0], 'manufacturer'), 'Сименс');
    assert.strictEqual(getEquipmentColumnValue(sampleEquipment[0], 'model'), 'H-100');
    assert.strictEqual(getEquipmentColumnValue(sampleEquipment[0], 'location'), 'Цех №1');
    assert.strictEqual(getEquipmentColumnValue(sampleEquipment[0], 'status'), 'ACTIVE');
  });

  it('correctly extracts custom fields including department and criticality', () => {
    assert.strictEqual(getEquipmentColumnValue(sampleEquipment[0], 'department'), 'Механический участок');
    assert.strictEqual(getEquipmentColumnValue(sampleEquipment[0], 'criticality'), 'A');
    assert.strictEqual(getEquipmentColumnValue(sampleEquipment[2], 'criticality'), 'B');
  });

  it('extracts distinct column values and counts frequencies accurately', () => {
    const values = extractDistinctColumnValues(sampleEquipment, 'manufacturer');
    assert.strictEqual(values.length, 2);
    // Сименс appears twice, Siemens AG appears once
    assert.strictEqual(values[0].value, 'Сименс');
    assert.strictEqual(values[0].count, 2);
    assert.strictEqual(values[1].value, 'Siemens AG');
    assert.strictEqual(values[1].count, 1);
  });

  it('filters distinct column values by search query', () => {
    const values = extractDistinctColumnValues(sampleEquipment, 'location', '№2');
    assert.strictEqual(values.length, 1);
    assert.strictEqual(values[0].value, 'Цех №2');
  });

  it('computes exact match replacement correctly', () => {
    const res1 = computeReplacement('Сименс', 'Сименс', 'Siemens', 'EXACT');
    assert.strictEqual(res1.matched, true);
    assert.strictEqual(res1.newValue, 'Siemens');

    const res2 = computeReplacement('Siemens AG', 'Сименс', 'Siemens', 'EXACT');
    assert.strictEqual(res2.matched, false);
    assert.strictEqual(res2.newValue, 'Siemens AG');
  });

  it('computes substring match replacement with regex escaping', () => {
    const res = computeReplacement('Цех №1 (Механический)', 'Цех №1', 'Цех №10', 'CONTAINS');
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.newValue, 'Цех №10 (Механический)');
  });

  it('prepares direct equipment update payload', () => {
    const update = prepareEquipmentFieldUpdate('manufacturer', 'Siemens AG', null);
    assert.deepStrictEqual(update.directData, { manufacturer: 'Siemens AG' });
  });

  it('prepares custom field update payload with legacy field synchronization', () => {
    const update = prepareEquipmentFieldUpdate('department', 'Энергослужба', { oldField: 123 });
    assert.strictEqual(update.customFields?.department, 'Энергослужба');
    assert.strictEqual(update.customFields?.service_group, 'Энергослужба');
    assert.strictEqual(update.customFields?.equipment_group, 'Энергослужба');
    assert.strictEqual(update.customFields?.oldField, 123);
  });

  it('supports registered columns configuration with human-readable labels', () => {
    const manufacturerCol = BATCH_EDIT_COLUMNS.find((c) => c.id === 'manufacturer');
    assert.ok(manufacturerCol);
    assert.strictEqual(manufacturerCol.label, 'Предприятие-изготовитель');

    const statusCol = BATCH_EDIT_COLUMNS.find((c) => c.id === 'status');
    assert.ok(statusCol);
    assert.strictEqual(statusCol.valueType, 'status');
    assert.ok(statusCol.options && statusCol.options.length > 0);
  });
});

describe('EPS Batch Edit: RBAC Permission Enforcement', () => {
  it('identifies EPS_EQUIPMENT_BATCH_EDIT permission in permission codes', () => {
    assert.strictEqual(PERMISSIONS.EPS_EQUIPMENT_BATCH_EDIT, 'eps.equipment.batch_edit');
  });

  it('permits user with explicit EPS_EQUIPMENT_BATCH_EDIT permission', () => {
    const user = {
      userId: 'user-batch-1',
      username: 'engineer1',
      roles: ['engineer'],
      permissions: ['eps.equipment.view', 'eps.equipment.batch_edit'],
    };
    assert.strictEqual(hasPermission(user as any, PERMISSIONS.EPS_EQUIPMENT_BATCH_EDIT), true);
  });

  it('denies user without EPS_EQUIPMENT_BATCH_EDIT permission', () => {
    const user = {
      userId: 'user-regular',
      username: 'operator1',
      roles: ['operator'],
      permissions: ['eps.equipment.view'],
    };
    assert.strictEqual(hasPermission(user as any, PERMISSIONS.EPS_EQUIPMENT_BATCH_EDIT), false);
  });

  it('allows system administrator to bypass permission check', () => {
    const adminUser = {
      userId: 'admin-1',
      username: 'sysadmin',
      roles: ['admin'],
      permissions: [],
    };
    assert.strictEqual(hasPermission(adminUser as any, PERMISSIONS.EPS_EQUIPMENT_BATCH_EDIT), true);
  });
});
