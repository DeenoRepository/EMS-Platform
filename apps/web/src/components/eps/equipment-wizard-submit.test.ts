import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEquipmentWizardPayload,
  validateEquipmentWizardInput,
} from './equipment-wizard-submit';

describe('equipment wizard submit helpers', () => {
  test('rejects a blank equipment name', () => {
    assert.equal(
      validateEquipmentWizardInput({ name: '   ' }),
      'Наименование оборудования обязательно',
    );
    assert.equal(validateEquipmentWizardInput({ name: 'Pump' }), null);
  });

  test('trims text fields and maps draft and approval modes', () => {
    const payload = buildEquipmentWizardPayload({
      name: '  Pump  ',
      inventoryNumber: ' INV-1 ',
      serialNumber: ' ',
      manufacturer: ' Acme ',
      model: ' Model X ',
      location: ' Workshop ',
      status: 'ACTIVE',
      commissionDate: '2026-09-01',
      tagIds: ['tag-1'],
      customFields: { power: 5 },
      submitForApproval: false,
    });

    assert.deepEqual(payload, {
      name: 'Pump',
      inventoryNumber: 'INV-1',
      serialNumber: undefined,
      manufacturer: 'Acme',
      model: 'Model X',
      location: 'Workshop',
      status: 'ACTIVE',
      commissionDate: '2026-09-01',
      tagIds: ['tag-1'],
      customFields: { power: 5 },
      asDraft: true,
      submitForApproval: false,
    });

    const approvalPayload = buildEquipmentWizardPayload({
        name: 'Pump',
        inventoryNumber: '',
        serialNumber: '',
        manufacturer: '',
        model: '',
        location: '',
        status: 'ACTIVE',
        commissionDate: '2026-09-01',
        tagIds: [],
        customFields: {},
        submitForApproval: true,
      });
    assert.equal(approvalPayload.submitForApproval, true);
  });
});
