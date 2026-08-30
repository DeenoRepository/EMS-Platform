import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EquipmentStatus } from '@ems/database';
import {
  buildEquipmentStatusCounts,
  buildEquipmentWhereInput,
  parseEquipmentListQuery,
} from './get-query';

test('parses equipment list defaults, aliases, and page-size bounds', () => {
  assert.deepEqual(parseEquipmentListQuery(new URLSearchParams({
    page: '0',
    limit: '2000',
    search: ' pump ',
    status: 'ACTIVE',
    tagId: 'tag-1',
    manufacturer: ' ACME ',
  })), {
    search: ' pump ',
    status: 'ACTIVE',
    tagId: 'tag-1',
    manufacturer: ' ACME ',
    page: 0,
    pageSize: 1000,
  });

  assert.deepEqual(parseEquipmentListQuery(new URLSearchParams()), {
    search: '',
    status: null,
    tagId: '',
    manufacturer: '',
    page: 1,
    pageSize: 20,
  });
});

test('builds equipment filter for all supported query fields', () => {
  assert.deepEqual(buildEquipmentWhereInput({
    search: 'pump',
    status: EquipmentStatus.ACTIVE,
    tagId: 'tag-1',
    manufacturer: 'ACME',
  }), {
    status: EquipmentStatus.ACTIVE,
    manufacturer: { contains: 'ACME', mode: 'insensitive' },
    tags: { some: { tagId: 'tag-1' } },
    OR: [
      { name: { contains: 'pump', mode: 'insensitive' } },
      { inventoryNumber: { contains: 'pump', mode: 'insensitive' } },
      { serialNumber: { contains: 'pump', mode: 'insensitive' } },
      { manufacturer: { contains: 'pump', mode: 'insensitive' } },
      { model: { contains: 'pump', mode: 'insensitive' } },
      { location: { contains: 'pump', mode: 'insensitive' } },
    ],
  });
});

test('aggregates every equipment status and keeps unknown statuses in total', () => {
  assert.deepEqual(buildEquipmentStatusCounts([
    { status: 'ACTIVE', _count: { status: 2 } },
    { status: 'UNDER_REPAIR', _count: { status: 3 } },
    { status: 'IN_STORAGE', _count: { status: 4 } },
    { status: 'DECOMMISSIONED', _count: { status: 5 } },
    { status: 'DRAFT', _count: { status: 6 } },
  ]), {
    total: 20,
    active: 2,
    underRepair: 3,
    inStorage: 4,
    decommissioned: 5,
    draft: 6,
  });
});
