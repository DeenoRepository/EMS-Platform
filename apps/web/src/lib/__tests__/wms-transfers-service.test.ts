/**
 * Тесты сервисного слоя перемещений WMS.
 *
 * Здесь сосредоточена логика ограничения видимости: какие склады доступны
 * пользователю и по каким складам считаются счётчики вкладок. Ошибка в этих
 * ветвлениях — не косметическая: кладовщик увидит перемещения чужих складов
 * либо, наоборот, потеряет свои. Типы такую ошибку не ловят, поэтому нужен
 * исполняемый тест.
 *
 * Проверяются:
 *   • признак «администратора перемещений» по трём независимым основаниям;
 *   • резолвинг складов: явный warehouseId, админ, обычный пользователь;
 *   • счётчики вкладок для админа, для пользователя со складами и без них;
 *   • пересечение запрошенного склада с доступными пользователю (запрос
 *     чужого склада не должен раскрывать его содержимое);
 *   • формат номера перемещения для заявки и для отгрузки.
 *
 * Реальное подключение к PostgreSQL не открывается: prisma полностью замокан
 * через mock.module('@ems/database').
 *
 * Requires TSX_TSCONFIG_PATH=apps/web/tsconfig.json (set by test-runner.mjs).
 */
import { test, describe, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';

const StockTransferStatus = {
  REQUESTED: 'REQUESTED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

interface CountCall {
  where: Record<string, unknown>;
}

let warehouseRows: Array<{ id: string }> = [];
let lastWarehouseArgs: unknown = null;
let countCalls: CountCall[] = [];
let countQueue: number[] = [];

const prismaMock = {
  warehouse: {
    findMany: async (args: unknown) => {
      lastWarehouseArgs = args;
      return warehouseRows;
    },
  },
  stockTransfer: {
    count: async (args: CountCall) => {
      countCalls.push(args);
      return countQueue.length > 0 ? (countQueue.shift() as number) : 0;
    },
  },
};

mock.module('@ems/database', {
  namedExports: { prisma: prismaMock, StockTransferStatus },
});

type ServiceModule = typeof import('../wms-transfers-service');
let service: ServiceModule;

function user(permissions: string[], roles: string[] = ['storekeeper']): JwtUserPayload {
  return {
    userId: 'user-1',
    ldapLogin: 'user',
    displayName: 'User',
    roles,
    permissions,
  } as JwtUserPayload;
}

describe('WMS transfers service', () => {
  before(async () => {
    service = await import('../wms-transfers-service');
  });

  beforeEach(() => {
    warehouseRows = [];
    lastWarehouseArgs = null;
    countCalls = [];
    countQueue = [];
  });

  describe('isTransfersAdmin', () => {
    test('признаёт администратора платформы', () => {
      assert.equal(service.isTransfersAdmin(user([], ['admin'])), true);
    });

    test('признаёт право управления настройками', () => {
      assert.equal(
        service.isTransfersAdmin(user([PERMISSIONS.ADMIN_SETTINGS_MANAGE])),
        true,
      );
    });

    test('признаёт право управления складами', () => {
      assert.equal(
        service.isTransfersAdmin(user([PERMISSIONS.WMS_WAREHOUSES_MANAGE])),
        true,
      );
    });

    test('отказывает пользователю только с правом просмотра остатков', () => {
      assert.equal(service.isTransfersAdmin(user([PERMISSIONS.WMS_STOCK_VIEW])), false);
    });
  });

  describe('resolveUserWarehouseIds', () => {
    test('использует явно запрошенный склад без обращения к БД', async () => {
      const result = await service.resolveUserWarehouseIds({
        isAdmin: false,
        warehouseId: 'wh-9',
        userId: 'user-1',
      });

      assert.deepEqual(result, ['wh-9']);
      assert.equal(lastWarehouseArgs, null, 'запрос к БД не требуется');
    });

    test('возвращает пустую область для админа без выбранного склада', async () => {
      const result = await service.resolveUserWarehouseIds({
        isAdmin: true,
        warehouseId: null,
        userId: 'user-1',
      });

      assert.deepEqual(result, []);
      assert.equal(lastWarehouseArgs, null);
    });

    test('ограничивает обычного пользователя его подотчётными складами', async () => {
      warehouseRows = [{ id: 'wh-1' }, { id: 'wh-2' }];

      const result = await service.resolveUserWarehouseIds({
        isAdmin: false,
        warehouseId: null,
        userId: 'user-42',
      });

      assert.deepEqual(result, ['wh-1', 'wh-2']);
      assert.deepEqual(lastWarehouseArgs, {
        where: { responsibleUserId: 'user-42' },
        select: { id: true },
      });
    });
  });

  describe('generateTransferNumber', () => {
    test('различает префиксы заявки и отгрузки', () => {
      assert.match(service.generateTransferNumber(true), /^REQ-\d{8}-[0-9A-F]{6}$/);
      assert.match(service.generateTransferNumber(false), /^TR-\d{8}-[0-9A-F]{6}$/);
    });

    test('не выдаёт одинаковые номера подряд', () => {
      const a = service.generateTransferNumber(false);
      const b = service.generateTransferNumber(false);
      assert.notEqual(a, b);
    });
  });

  describe('getTransferTabCounts', () => {
    test('для админа без склада считает по всей системе', async () => {
      countQueue = [3, 5, 7];

      const result = await service.getTransferTabCounts({
        isAdmin: true,
        warehouseId: null,
        userWarehouseIds: [],
        total: 15,
      });

      assert.deepEqual(result, { inbound: 3, requests: 5, outbound: 7, total: 15 });
      assert.equal(countCalls.length, 3);
      assert.deepEqual(countCalls[0].where, { status: 'IN_TRANSIT' });
      assert.deepEqual(countCalls[1].where, { status: 'REQUESTED' });
    });

    test('для админа с выбранным складом фильтрует по нему', async () => {
      countQueue = [1, 2, 4];

      await service.getTransferTabCounts({
        isAdmin: true,
        warehouseId: 'wh-7',
        userWarehouseIds: [],
        total: 7,
      });

      assert.deepEqual(countCalls[0].where, {
        targetWarehouseId: 'wh-7',
        status: 'IN_TRANSIT',
      });
      assert.deepEqual(countCalls[2].where, {
        sourceWarehouseId: 'wh-7',
        status: 'IN_TRANSIT',
      });
    });

    test('обычному пользователю считает только по его складам', async () => {
      countQueue = [2, 0, 1];

      const result = await service.getTransferTabCounts({
        isAdmin: false,
        warehouseId: null,
        userWarehouseIds: ['wh-1', 'wh-2'],
        total: 3,
      });

      assert.deepEqual(result, { inbound: 2, requests: 0, outbound: 1, total: 3 });
      assert.deepEqual(countCalls[0].where, {
        targetWarehouseId: { in: ['wh-1', 'wh-2'] },
        status: 'IN_TRANSIT',
      });
    });

    test('не раскрывает чужой склад, запрошенный вне зоны ответственности', async () => {
      countQueue = [9, 9, 9];

      await service.getTransferTabCounts({
        isAdmin: false,
        warehouseId: 'wh-foreign',
        userWarehouseIds: ['wh-1'],
        total: 0,
      });

      assert.deepEqual(
        countCalls[0].where,
        { targetWarehouseId: { in: [] }, status: 'IN_TRANSIT' },
        'запрошенный чужой склад должен схлопываться в пустую выборку',
      );
    });

    test('сужает выборку до пересечения, когда склад доступен пользователю', async () => {
      countQueue = [1, 1, 1];

      await service.getTransferTabCounts({
        isAdmin: false,
        warehouseId: 'wh-1',
        userWarehouseIds: ['wh-1', 'wh-2'],
        total: 3,
      });

      assert.deepEqual(countCalls[0].where, {
        targetWarehouseId: { in: ['wh-1'] },
        status: 'IN_TRANSIT',
      });
    });

    test('возвращает нули и не обращается к БД, когда складов нет', async () => {
      const result = await service.getTransferTabCounts({
        isAdmin: false,
        warehouseId: null,
        userWarehouseIds: [],
        total: 0,
      });

      assert.deepEqual(result, { inbound: 0, requests: 0, outbound: 0, total: 0 });
      assert.equal(countCalls.length, 0);
    });
  });
});
