/**
 * Тесты чистой модели where-фильтра заявок PRM.
 *
 * Проверяет видимость по scope (all/my_requests/to_review), warehouseId
 * фильтрацию и защиту от утечки чужих заявок для не-администраторов.
 * PurchaseRequestStatus — это просто enum без побочных эффектов (как и
 * StockTransferStatus в wms-transfers.test.ts), поэтому мокать @ems/database
 * не требуется — реального подключения к БД при импорте enum не происходит.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PurchaseRequestStatus } from '@ems/database';
import { buildPurchaseRequestWhereModel } from '../prm-request-where-model';

describe('buildPurchaseRequestWhereModel', () => {
  test('игнорирует некорректный статус', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'all',
      status: 'NOT_A_STATUS',
      userId: 'user-1',
      isAdmin: true,
      userWarehouseIds: [],
    });
    assert.equal(where.status, undefined);
  });

  test('применяет корректный статус', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'all',
      status: 'DRAFT',
      userId: 'user-1',
      isAdmin: true,
      userWarehouseIds: [],
    });
    assert.equal(where.status, 'DRAFT');
  });

  test('scope=to_review принудительно фильтрует по SUBMITTED, перекрывая status', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'to_review',
      status: 'DRAFT',
      userId: 'user-1',
      isAdmin: true,
      userWarehouseIds: [],
    });
    assert.equal(where.status, PurchaseRequestStatus.SUBMITTED);
  });

  test('scope=my_requests ограничивает по requesterId', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'my_requests',
      userId: 'user-1',
      isAdmin: false,
      userWarehouseIds: [],
    });
    assert.equal(where.requesterId, 'user-1');
  });

  test('явный доступный warehouseId фильтрует по targetWarehouseId', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'all',
      warehouseId: 'wh-5',
      userId: 'user-1',
      isAdmin: false,
      userWarehouseIds: ['wh-5'],
    });
    assert.equal(where.targetWarehouseId, 'wh-5');
  });

  test('явный чужой warehouseId схлопывается в пустую выборку', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'all',
      warehouseId: 'foreign-warehouse',
      userId: 'user-1',
      isAdmin: false,
      userWarehouseIds: ['wh-1'],
    });
    assert.deepEqual(where.targetWarehouseId, { in: [] });
  });

  test('не-админ без warehouseId видит только свои заявки и заявки на свои склады (OR)', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'all',
      userId: 'user-1',
      isAdmin: false,
      userWarehouseIds: ['wh-1', 'wh-2'],
    });
    assert.deepEqual(where.OR, [
      { requesterId: 'user-1' },
      { targetWarehouseId: { in: ['wh-1', 'wh-2'] } },
    ]);
  });

  test('не-админ без подотчётных складов видит только свои заявки', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'all',
      userId: 'user-1',
      isAdmin: false,
      userWarehouseIds: [],
    });
    assert.deepEqual(where.OR, [{ requesterId: 'user-1' }]);
  });

  test('админ без warehouseId не получает ограничивающий OR (видит все заявки)', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'all',
      userId: 'admin-1',
      isAdmin: true,
      userWarehouseIds: [],
    });
    assert.equal(where.OR, undefined);
    assert.equal(where.requesterId, undefined);
  });

  test('поиск оборачивает OR условий в AND, не затирая scope-фильтр', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'my_requests',
      search: 'насос',
      userId: 'user-1',
      isAdmin: false,
      userWarehouseIds: [],
    });
    assert.equal(where.requesterId, 'user-1');
    assert.ok(Array.isArray(where.AND));
    assert.equal((where.AND as any[])[0].OR.length, 5);
  });

  test('применяет equipmentId и maintenanceScheduleId фильтры', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'all',
      equipmentId: 'eq-42',
      maintenanceScheduleId: 'sch-10',
      userId: 'user-1',
      isAdmin: true,
      userWarehouseIds: [],
    });
    assert.equal(where.equipmentId, 'eq-42');
    assert.equal(where.maintenanceScheduleId, 'sch-10');
  });

  test('equipmentId и maintenanceScheduleId не затирают scoping для не-администратора', () => {
    const where = buildPurchaseRequestWhereModel({
      scope: 'all',
      equipmentId: 'eq-42',
      maintenanceScheduleId: 'sch-10',
      userId: 'user-1',
      isAdmin: false,
      userWarehouseIds: ['wh-1', 'wh-2'],
    });
    assert.equal(where.equipmentId, 'eq-42');
    assert.equal(where.maintenanceScheduleId, 'sch-10');
    assert.deepEqual(where.OR, [
      { requesterId: 'user-1' },
      { targetWarehouseId: { in: ['wh-1', 'wh-2'] } },
    ]);
  });
});
