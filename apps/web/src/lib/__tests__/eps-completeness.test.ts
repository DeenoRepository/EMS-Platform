import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { checkEquipmentCardCompleteness } from '../eps-helpers';
import { matchesAllEquipmentFilters, getActiveEquipmentFilterBadges } from '../eps-filter-helpers';
import { buildEquipmentWhereInput } from '../eps-query-builder';
import { DEFAULT_EQUIPMENT_FILTERS, EquipmentFilters } from '../../components/eps/EquipmentFilterTypes';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS Equipment Card Completeness & Warning Column', () => {
  it('detects incomplete card when essential fields are missing', () => {
    const emptyItem = {
      name: 'Насос',
      inventoryNumber: 'ИНВ-001',
    };

    const res = checkEquipmentCardCompleteness(emptyItem);
    assert.strictEqual(res.isIncomplete, true);
    assert.ok(res.missingFields.length > 0);
    assert.ok(res.missingFields.includes('Заводской (серийный) номер'));
    assert.ok(res.missingFields.includes('Предприятие-изготовитель'));
    assert.ok(res.missingFields.includes('Модель / типоразмер'));
    assert.ok(res.missingFields.includes('Место установки (локация)'));
    assert.ok(res.missingFields.includes('Дата ввода в эксплуатацию'));
    assert.ok(res.missingFields.includes('Ответственное лицо (МОЛ)'));
    assert.ok(res.missingFields.includes('Категория критичности'));
    assert.ok(res.missingFields.includes('Подразделение / группа'));
    assert.ok(res.missingFields.includes('Вид оборудования'));
  });

  it('marks card as complete when all key fields are filled', () => {
    const fullItem = {
      name: 'Установка плазмохимического травления',
      inventoryNumber: 'ИНВ-12345',
      serialNumber: 'SN-998877',
      manufacturer: 'Oxford Instruments',
      model: 'PlasmaPro 100',
      location: 'Цех 10, Чистая комната',
      commissionDate: '2023-05-10T00:00:00.000Z',
      status: 'ACTIVE',
      customFields: {
        responsible_person_name: 'Иванов И.И.',
        criticality: 'A',
        department: 'Цех микроэлектроники',
        equipment_kind: 'Установки травления',
        maintenance_periodicity: 'Ежеквартально',
      },
    };

    const res = checkEquipmentCardCompleteness(fullItem);
    assert.strictEqual(res.isIncomplete, false);
    assert.strictEqual(res.missingFields.length, 0);
    assert.strictEqual(res.filledCount, res.totalCount);
  });

  it('filters equipment by completeness state', () => {
    const completeItem = {
      name: 'Установка',
      inventoryNumber: 'ИНВ-12345',
      serialNumber: 'SN-998877',
      manufacturer: 'Oxford',
      model: 'PlasmaPro',
      location: 'Цех 10',
      commissionDate: '2023-05-10',
      status: 'ACTIVE',
      customFields: {
        responsible_person_name: 'Иванов',
        criticality: 'B',
        department: 'Цех 10',
        equipment_kind: 'Установки',
        maintenance_periodicity: 'Ежемесячно',
      },
    };

    const incompleteItem = {
      name: 'Компрессор',
      inventoryNumber: 'ИНВ-002',
    };

    const filterIncomplete: EquipmentFilters = {
      ...DEFAULT_EQUIPMENT_FILTERS,
      completeness: 'incomplete',
    };

    const filterComplete: EquipmentFilters = {
      ...DEFAULT_EQUIPMENT_FILTERS,
      completeness: 'complete',
    };

    assert.strictEqual(matchesAllEquipmentFilters(incompleteItem, filterIncomplete), true);
    assert.strictEqual(matchesAllEquipmentFilters(completeItem, filterIncomplete), false);

    assert.strictEqual(matchesAllEquipmentFilters(completeItem, filterComplete), true);
    assert.strictEqual(matchesAllEquipmentFilters(incompleteItem, filterComplete), false);
  });

  it('generates active filter badges for completeness filter', () => {
    const f: EquipmentFilters = {
      ...DEFAULT_EQUIPMENT_FILTERS,
      completeness: 'incomplete',
    };

    const badges = getActiveEquipmentFilterBadges(f);
    assert.ok(badges.some((b) => b.key === 'completeness' && b.value.includes('Не все поля')));
  });

  it('builds where query in eps-query-builder for completeness filter', () => {
    const paramsIncomplete = new URLSearchParams({ completeness: 'incomplete' });
    const whereIncomplete = buildEquipmentWhereInput(paramsIncomplete);
    assert.ok(whereIncomplete.AND);
    const and = whereIncomplete.AND as any[];
    assert.ok(and.some((cond) => Array.isArray(cond.OR)));

    const paramsComplete = new URLSearchParams({ completeness: 'complete' });
    const whereComplete = buildEquipmentWhereInput(paramsComplete);
    assert.ok(whereComplete.AND);
    const andComp = whereComplete.AND as any[];
    assert.ok(andComp.some((cond) => Array.isArray(cond.AND)));
  });

  it('equipment registry page defines completeness column and warning icon in table', () => {
    const pageSource = readProjectFile('apps/web/src/app/eps/page.tsx');
    assert.match(pageSource, /id:\s*'completeness'/);
    assert.match(pageSource, /label:\s*'Полнота заполнения карточки'/);
    assert.match(pageSource, /checkEquipmentCardCompleteness/);
    assert.match(pageSource, /visibleColumns\.includes\('completeness'\)/);
    assert.match(pageSource, /WarningAmberIcon/);
    assert.match(pageSource, /В карточке заполнены не все поля/);
    assert.match(pageSource, /comp\.missingFields/);
  });

  it('column filters row includes completeness selector', () => {
    const filterRowSource = readProjectFile('apps/web/src/components/eps/EquipmentColumnFiltersRow.tsx');
    assert.match(filterRowSource, /visibleColumns\.includes\('completeness'\)/);
    assert.match(filterRowSource, /onChangeFilter\('completeness'/);
  });
});
