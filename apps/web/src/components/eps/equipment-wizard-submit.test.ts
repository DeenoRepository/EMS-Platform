import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildEquipmentWizardPayload, validateEquipmentWizardInput } from './equipment-wizard-submit';

describe('equipment wizard submit model', () => {
  test('requires a non-empty trimmed name', () => {
    assert.match(validateEquipmentWizardInput({ name: '' }) ?? '', /обязательно/);
    assert.match(validateEquipmentWizardInput({ name: '   ' }) ?? '', /обязательно/);
    assert.equal(validateEquipmentWizardInput({ name: 'Pump' }), null);
  });

  test('trims optional fields and converts blank strings to undefined', () => {
    const payload = buildEquipmentWizardPayload({
      name: '  Pump  ',
      inventoryNumber: '  ',
      serialNumber: 'SN-1',
      manufacturer: '',
      model: 'M-1',
      location: '  Hall A  ',
      status: 'ACTIVE',
      commissionDate: '2026-01-01',
      tagIds: ['t1'],
      customFields: { voltage: 220 },
      submitForApproval: true,
    });

    assert.equal(payload.name, 'Pump');
    assert.equal(payload.inventoryNumber, undefined);
    assert.equal(payload.serialNumber, 'SN-1');
    assert.equal(payload.manufacturer, undefined);
    assert.equal(payload.location, 'Hall A');
    assert.equal(payload.asDraft, false);
    assert.equal(payload.submitForApproval, true);
  });

  test('sets asDraft to true when not submitting for approval', () => {
    const payload = buildEquipmentWizardPayload({
      name: 'Pump',
      inventoryNumber: '',
      serialNumber: '',
      manufacturer: '',
      model: '',
      location: '',
      status: 'DRAFT',
      commissionDate: '',
      tagIds: [],
      customFields: {},
      submitForApproval: false,
    });
    assert.equal(payload.asDraft, true);
    assert.equal(payload.submitForApproval, false);
  });
});
