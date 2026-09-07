import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getEquipmentKind, getEquipmentDepartment } from '../eps-helpers';

describe('EPS Equipment Registry Columns (Kind vs Department)', () => {
  it('correctly extracts equipment kind when equipment_type contains a maintenance group/department', () => {
    const custom = {
      equipment_group: 'Испытательное оборудование',
      equipment_type: 'Группа обслуживания и ремонта измерений КП ИМС',
    };

    assert.strictEqual(getEquipmentKind(custom), 'Испытательное оборудование');
    assert.strictEqual(getEquipmentDepartment(custom), 'Группа обслуживания и ремонта измерений КП ИМС');
  });

  it('correctly extracts equipment kind for vacuum post maintenance group', () => {
    const custom = {
      equipment_group: 'Оборудование специального назначения прочее',
      equipment_type: 'Группа обслуживания и ремонта вакуумных постов, НПК СП, цеха 10',
    };

    assert.strictEqual(getEquipmentKind(custom), 'Оборудование специального назначения прочее');
    assert.strictEqual(getEquipmentDepartment(custom), 'Группа обслуживания и ремонта вакуумных постов, НПК СП, цеха 10');
  });

  it('correctly extracts equipment kind when equipment_type is an actual equipment kind (e.g. pumps/compressors)', () => {
    const custom = {
      equipment_group: 'Механическое и химико-механическое',
      equipment_type: 'Насосы',
    };

    assert.strictEqual(getEquipmentKind(custom), 'Насосы');
    assert.strictEqual(getEquipmentDepartment(custom), 'Механическое и химико-механическое');
  });

  it('handles custom.equipment_kind when present', () => {
    const custom = {
      equipment_kind: 'Измерительное оборудование',
      equipment_type: 'Группа обслуживания и ремонта измерений КП ИМС',
    };

    assert.strictEqual(getEquipmentKind(custom), 'Измерительное оборудование');
    assert.strictEqual(getEquipmentDepartment(custom), 'Группа обслуживания и ремонта измерений КП ИМС');
  });

  it('falls back gracefully to dash when empty', () => {
    assert.strictEqual(getEquipmentKind({}), '—');
    assert.strictEqual(getEquipmentDepartment({}), '—');
  });
});
