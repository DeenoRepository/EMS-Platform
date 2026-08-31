import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildOperationLineItem, type AddOperationItemInput } from './operation-item';

const nomenclature = { id: 'n1', name: 'Bearing', article: 'ART-1', unit: 'pcs' };
const equipment = { id: 'e1', name: 'Pump', inventoryNumber: 'INV-1' };

function baseInput(overrides: Partial<AddOperationItemInput> = {}): AddOperationItemInput {
  return {
    selectedNomenclature: nomenclature as never,
    itemQty: '2',
    isOutflow: false,
    getAvailableStock: () => 10,
    operationType: 'INCOME' as never,
    itemEquipmentId: '',
    itemWriteOffType: 'EQUIPMENT',
    equipmentList: [equipment as never],
    ...overrides,
  };
}

describe('operation line item builder', () => {
  test('requires a selected nomenclature', () => {
    const result = buildOperationLineItem(baseInput({ selectedNomenclature: null }));
    assert.equal(result.kind, 'error');
    assert.equal((result as { variant: string }).variant, 'warning');
  });

  test('rejects a zero, negative, or non-numeric quantity', () => {
    for (const qty of ['0', '-1', 'abc']) {
      const result = buildOperationLineItem(baseInput({ itemQty: qty }));
      assert.equal(result.kind, 'error');
    }
  });

  test('rejects outflow when stock is depleted or insufficient', () => {
    const depleted = buildOperationLineItem(baseInput({ isOutflow: true, getAvailableStock: () => 0 }));
    assert.equal(depleted.kind, 'error');
    assert.equal((depleted as { variant: string }).variant, 'error');

    const insufficient = buildOperationLineItem(baseInput({ isOutflow: true, itemQty: '20', getAvailableStock: () => 5 }));
    assert.equal(insufficient.kind, 'error');
  });

  test('builds a valid income line item without write-off fields', () => {
    const result = buildOperationLineItem(baseInput());
    assert.equal(result.kind, 'item');
    if (result.kind === 'item') {
      assert.equal(result.item.nomenclatureId, 'n1');
      assert.equal(result.item.quantity, 2);
      assert.equal(result.item.equipmentId, undefined);
    }
  });

  test('write-off to equipment adds equipmentId and a descriptive reason', () => {
    const result = buildOperationLineItem(
      baseInput({ operationType: 'ISSUE_WRITE_OFF' as never, itemWriteOffType: 'EQUIPMENT', itemEquipmentId: 'e1' }),
    );
    assert.equal(result.kind, 'item');
    if (result.kind === 'item') {
      assert.equal(result.item.equipmentId, 'e1');
      assert.match(result.item.writeOffReason ?? '', /Pump/);
    }
  });

  test('write-off without an equipment match falls back to a general reason', () => {
    const result = buildOperationLineItem(
      baseInput({ operationType: 'ISSUE_WRITE_OFF' as never, itemWriteOffType: 'EQUIPMENT', itemEquipmentId: 'missing' }),
    );
    assert.equal(result.kind, 'item');
    if (result.kind === 'item') {
      assert.equal(result.item.writeOffReason, 'Общее списание на оборудование');
    }
  });

  test('write-off to DEFECT/SCRAP/OTHER use fixed reasons', () => {
    for (const [type, expected] of [
      ['DEFECT', 'Списание в брак / дефект'],
      ['SCRAP', 'Списание в неликвид'],
      ['OTHER', 'Утилизация / износ'],
    ] as const) {
      const result = buildOperationLineItem(
        baseInput({ operationType: 'ISSUE_WRITE_OFF' as never, itemWriteOffType: type }),
      );
      assert.equal(result.kind, 'item');
      if (result.kind === 'item') assert.equal(result.item.writeOffReason, expected);
    }
  });
});
