import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  matchesText,
  matchesNumberRange,
  matchesDateRange,
  matchesTriState,
  matchesCountFilter,
  matchesAllEquipmentFilters,
  countActiveEquipmentFilters,
  getActiveEquipmentFilterBadges,
} from '../eps-filter-helpers';
import { DEFAULT_EQUIPMENT_FILTERS, EquipmentFilters } from '../../components/eps/EquipmentFilterTypes';

describe('EPS Filter Helpers', () => {
  it('matchesText performs case-insensitive substring checks', () => {
    assert.strictEqual(matchesText('Насос вакуумный', 'вакуум'), true);
    assert.strictEqual(matchesText('Насос вакуумный', 'НАСОС'), true);
    assert.strictEqual(matchesText('Насос', 'компрессор'), false);
    assert.strictEqual(matchesText(null, 'тест'), false);
    assert.strictEqual(matchesText('любой', ''), true);
    assert.strictEqual(matchesText('любой', undefined), true);
  });

  it('matchesNumberRange checks numeric intervals correctly', () => {
    assert.strictEqual(matchesNumberRange(25, '10', '50'), true);
    assert.strictEqual(matchesNumberRange(5, '10', '50'), false);
    assert.strictEqual(matchesNumberRange(55, '10', '50'), false);
    assert.strictEqual(matchesNumberRange(25, '25', '25'), true);
    assert.strictEqual(matchesNumberRange(25, '30', ''), false);
    assert.strictEqual(matchesNumberRange(25, '', '20'), false);
    assert.strictEqual(matchesNumberRange(null, '10', '50'), false);
    assert.strictEqual(matchesNumberRange(25, '', ''), true);
  });

  it('matchesDateRange checks date intervals correctly', () => {
    assert.strictEqual(matchesDateRange('2024-05-15T10:00:00Z', '2024-01-01', '2024-12-31'), true);
    assert.strictEqual(matchesDateRange('2023-05-15T10:00:00Z', '2024-01-01', '2024-12-31'), false);
    assert.strictEqual(matchesDateRange('2025-05-15T10:00:00Z', '2024-01-01', '2024-12-31'), false);
    assert.strictEqual(matchesDateRange(null, '2024-01-01', '2024-12-31'), false);
    assert.strictEqual(matchesDateRange('2024-05-15T10:00:00Z', '', ''), true);
  });

  it('matchesTriState correctly handles boolean / string representations', () => {
    assert.strictEqual(matchesTriState(true, 'true'), true);
    assert.strictEqual(matchesTriState('Да', 'true'), true);
    assert.strictEqual(matchesTriState('Нет', 'false'), true);
    assert.strictEqual(matchesTriState(false, 'false'), true);
    assert.strictEqual(matchesTriState(true, 'false'), false);
    assert.strictEqual(matchesTriState('Нет', 'true'), false);
    assert.strictEqual(matchesTriState(true, 'all'), true);
    assert.strictEqual(matchesTriState(false, ''), true);
  });

  it('matchesCountFilter correctly filters with and without items', () => {
    assert.strictEqual(matchesCountFilter(5, 'with'), true);
    assert.strictEqual(matchesCountFilter(0, 'with'), false);
    assert.strictEqual(matchesCountFilter(0, 'without'), true);
    assert.strictEqual(matchesCountFilter(3, 'without'), false);
    assert.strictEqual(matchesCountFilter(0, 'all'), true);
  });

  it('matchesAllEquipmentFilters filters across all columns and custom fields', () => {
    const item = {
      id: 'eq-1',
      name: 'Установка плазмохимического травления',
      inventoryNumber: 'ИНВ-00123',
      serialNumber: 'SN-998877',
      manufacturer: 'Oxford Instruments',
      model: 'PlasmaPro 100',
      location: 'Цех 10, Чистая комната',
      status: 'ACTIVE',
      commissionDate: '2023-04-10T00:00:00.000Z',
      createdAt: '2023-04-01T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
      tags: [{ id: 'tag-1', name: 'Критическое' }],
      _count: { documents: 3, spareParts: 5 },
      customFields: {
        criticality: 'A',
        actual_wear_percentage: '15',
        department: 'Цех микроэлектроники',
        equipment_kind: 'Установки травления',
        responsible_person_name: 'Иванов И.И.',
        okof_code: '330.28.99',
        okpd2_code: '28.99.39',
        process_classifier_code: 'ПР-01',
        maintenance_periodicity: 'Ежеквартально',
        calibration_interval: '12',
        clean_room_class: 'ISO 5',
        is_critical_path: 'Да',
        is_unique: 'Да',
        is_imported: 'Да',
      },
    };

    // 1. Matches default empty filters
    assert.strictEqual(matchesAllEquipmentFilters(item, DEFAULT_EQUIPMENT_FILTERS), true);

    // 2. Matches matching filters
    const matchingFilters: EquipmentFilters = {
      ...DEFAULT_EQUIPMENT_FILTERS,
      criticality: 'A',
      wearMin: '10',
      wearMax: '20',
      eqGroup: 'Цех',
      isCriticalPath: 'true',
      cleanRoom: 'ISO 5',
      documentsFilter: 'with',
      status: 'ACTIVE',
    };
    assert.strictEqual(matchesAllEquipmentFilters(item, matchingFilters), true);

    // 3. Fails when a condition does not match
    assert.strictEqual(
      matchesAllEquipmentFilters(item, { ...matchingFilters, criticality: 'B' }),
      false
    );
    assert.strictEqual(
      matchesAllEquipmentFilters(item, { ...matchingFilters, wearMax: '10' }),
      false
    );
    assert.strictEqual(
      matchesAllEquipmentFilters(item, { ...matchingFilters, isCriticalPath: 'false' }),
      false
    );
    assert.strictEqual(
      matchesAllEquipmentFilters(item, { ...matchingFilters, documentsFilter: 'without' }),
      false
    );
  });

  it('countActiveEquipmentFilters accurately counts non-empty filters', () => {
    assert.strictEqual(countActiveEquipmentFilters(DEFAULT_EQUIPMENT_FILTERS), 0);

    const f: EquipmentFilters = {
      ...DEFAULT_EQUIPMENT_FILTERS,
      search: 'тест',
      status: 'ACTIVE',
      criticality: 'A',
      isCriticalPath: 'all', // 'all' is not counted as active
    };
    assert.strictEqual(countActiveEquipmentFilters(f), 3);
  });

  it('getActiveEquipmentFilterBadges produces structured chips for active filters', () => {
    const f: EquipmentFilters = {
      ...DEFAULT_EQUIPMENT_FILTERS,
      status: 'ACTIVE',
      wearMin: '10',
      wearMax: '50',
      criticality: 'A',
      respPerson: 'Иванов',
    };
    const badges = getActiveEquipmentFilterBadges(f, [], { ACTIVE: 'В работе' });
    assert.strictEqual(badges.length, 4);
    assert.strictEqual(badges.find((b) => b.key === 'status')?.value, 'В работе');
    assert.strictEqual(badges.find((b) => b.key === 'wearRange')?.value, '10% — 50%');
    assert.strictEqual(badges.find((b) => b.key === 'respPerson')?.value, 'Иванов');
  });
});
