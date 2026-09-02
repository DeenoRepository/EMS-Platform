/**
 * Тесты сервисного слоя заявок на закупку ТМЦ (PRM).
 *
 * Здесь сосредоточена логика, ошибка в которой напрямую портит данные или
 * раскрывает доступ: кто считается администратором закупок, каким складам
 * подотчётен обычный пользователь, какие переходы статуса разрешены и кто
 * имеет право их выполнять. Типы такую ошибку не ловят, поэтому нужен
 * исполняемый тест.
 *
 * Реальное подключение к PostgreSQL не открывается: prisma полностью замокан
 * через mock.module('@ems/database').
 *
 * Requires TSX_TSCONFIG_PATH=apps/web/tsconfig.json (set by test-runner.mjs).
 */
import { test, describe, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';

const PurchaseRequestStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PARTIALLY_DELIVERED: 'PARTIALLY_DELIVERED',
  DELIVERED: 'DELIVERED',
  CLOSED: 'CLOSED',
} as const;

let warehouseRows: Array<{ id: string }> = [];
let lastWarehouseArgs: unknown = null;

const prismaMock = {
  warehouse: {
    findMany: async (args: unknown) => {
      lastWarehouseArgs = args;
      return warehouseRows;
    },
  },
};

mock.module('@ems/database', {
  namedExports: { prisma: prismaMock, PurchaseRequestStatus },
});

type ServiceModule = typeof import('../prm-requests-service');
let service: ServiceModule;

function user(permissions: string[], roles: string[] = ['requester']): JwtUserPayload {
  return {
    userId: 'user-1',
    ldapLogin: 'user',
    displayName: 'User',
    roles,
    permissions,
  } as JwtUserPayload;
}

describe('PRM requests service', () => {
  before(async () => {
    service = await import('../prm-requests-service');
  });

  beforeEach(() => {
    warehouseRows = [];
    lastWarehouseArgs = null;
  });

  describe('isPurchaseAdmin', () => {
    test('признаёт администратора платформы', () => {
      assert.equal(service.isPurchaseAdmin(user([], ['admin'])), true);
    });

    test('признаёт право управления настройками', () => {
      assert.equal(service.isPurchaseAdmin(user([PERMISSIONS.ADMIN_SETTINGS_MANAGE])), true);
    });

    test('признаёт право управления заявками PRM', () => {
      assert.equal(service.isPurchaseAdmin(user([PERMISSIONS.PRM_REQUESTS_MANAGE])), true);
    });

    test('отказывает пользователю только с правом создания заявок', () => {
      assert.equal(service.isPurchaseAdmin(user([PERMISSIONS.PRM_REQUESTS_CREATE])), false);
    });
  });

  describe('resolveUserWarehouseIds', () => {
    test('возвращает пустую область для админа', async () => {
      const result = await service.resolveUserWarehouseIds({ isAdmin: true, userId: 'user-1' });
      assert.deepEqual(result, []);
      assert.equal(lastWarehouseArgs, null);
    });

    test('ограничивает обычного пользователя его подотчётными складами', async () => {
      warehouseRows = [{ id: 'wh-1' }, { id: 'wh-2' }];
      const result = await service.resolveUserWarehouseIds({ isAdmin: false, userId: 'user-42' });
      assert.deepEqual(result, ['wh-1', 'wh-2']);
      assert.deepEqual(lastWarehouseArgs, {
        where: { responsibleUserId: 'user-42' },
        select: { id: true },
      });
    });
  });

  describe('generatePurchaseRequestNumber', () => {
    test('соответствует формату PR-YYYYMMDD-XXXXXX', () => {
      assert.match(service.generatePurchaseRequestNumber(), /^PR-\d{8}-[0-9A-F]{6}$/);
    });

    test('не выдаёт одинаковые номера подряд', () => {
      const a = service.generatePurchaseRequestNumber();
      const b = service.generatePurchaseRequestNumber();
      assert.notEqual(a, b);
    });
  });

  describe('calculateEstimatedTotal', () => {
    test('суммирует requestedQty * estimatedPrice по всем позициям', () => {
      const total = service.calculateEstimatedTotal([
        { requestedQty: 2, estimatedPrice: 100 },
        { requestedQty: 3, estimatedPrice: 50 },
      ]);
      assert.equal(total, 350);
    });

    test('возвращает 0 для пустого списка позиций', () => {
      assert.equal(service.calculateEstimatedTotal([]), 0);
    });
  });

  describe('isValidStatusTransition', () => {
    test('разрешает DRAFT -> SUBMITTED', () => {
      assert.equal(
        service.isValidStatusTransition(PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.SUBMITTED),
        true,
      );
    });

    test('разрешает DRAFT -> CANCELLED', () => {
      assert.equal(
        service.isValidStatusTransition(PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.CANCELLED),
        true,
      );
    });

    test('разрешает SUBMITTED -> APPROVED', () => {
      assert.equal(
        service.isValidStatusTransition(PurchaseRequestStatus.SUBMITTED, PurchaseRequestStatus.APPROVED),
        true,
      );
    });

    test('разрешает SUBMITTED -> REJECTED', () => {
      assert.equal(
        service.isValidStatusTransition(PurchaseRequestStatus.SUBMITTED, PurchaseRequestStatus.REJECTED),
        true,
      );
    });

    test('разрешает SUBMITTED -> CANCELLED', () => {
      assert.equal(
        service.isValidStatusTransition(PurchaseRequestStatus.SUBMITTED, PurchaseRequestStatus.CANCELLED),
        true,
      );
    });

    test('отклоняет DRAFT -> APPROVED (пропуск согласования)', () => {
      assert.equal(
        service.isValidStatusTransition(PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.APPROVED),
        false,
      );
    });

    test('отклоняет любой переход из APPROVED в P1 (терминальный для этой итерации)', () => {
      for (const target of Object.values(PurchaseRequestStatus)) {
        assert.equal(
          service.isValidStatusTransition(PurchaseRequestStatus.APPROVED, target),
          false,
          `APPROVED -> ${target} должен быть отклонён в P1`,
        );
      }
    });

    test('отклоняет попытку выставить DELIVERED напрямую из SUBMITTED (P2 функциональность)', () => {
      assert.equal(
        service.isValidStatusTransition(PurchaseRequestStatus.SUBMITTED, PurchaseRequestStatus.DELIVERED),
        false,
      );
    });

    test('отклоняет все переходы из REJECTED и CANCELLED', () => {
      for (const from of [PurchaseRequestStatus.REJECTED, PurchaseRequestStatus.CANCELLED] as const) {
        for (const target of Object.values(PurchaseRequestStatus)) {
          assert.equal(service.isValidStatusTransition(from, target), false, `${from} -> ${target} должен быть отклонён`);
        }
      }
    });
  });

  describe('canPerformTransition', () => {
    test('инициатор может подать свою заявку (DRAFT -> SUBMITTED)', () => {
      assert.equal(
        service.canPerformTransition({ to: PurchaseRequestStatus.SUBMITTED, isRequester: true, isAdmin: false }),
        true,
      );
    });

    test('посторонний не может подать чужую заявку', () => {
      assert.equal(
        service.canPerformTransition({ to: PurchaseRequestStatus.SUBMITTED, isRequester: false, isAdmin: false }),
        false,
      );
    });

    test('инициатор может отменить свою заявку', () => {
      assert.equal(
        service.canPerformTransition({ to: PurchaseRequestStatus.CANCELLED, isRequester: true, isAdmin: false }),
        true,
      );
    });

    test('админ может отменить чужую заявку', () => {
      assert.equal(
        service.canPerformTransition({ to: PurchaseRequestStatus.CANCELLED, isRequester: false, isAdmin: true }),
        true,
      );
    });

    test('только согласующий (не инициатор) может утвердить заявку', () => {
      assert.equal(
        service.canPerformTransition({ to: PurchaseRequestStatus.APPROVED, isRequester: true, isAdmin: false }),
        false,
      );
      assert.equal(
        service.canPerformTransition({ to: PurchaseRequestStatus.APPROVED, isRequester: false, isAdmin: true }),
        true,
      );
    });

    test('только согласующий может отклонить заявку', () => {
      assert.equal(
        service.canPerformTransition({ to: PurchaseRequestStatus.REJECTED, isRequester: true, isAdmin: false }),
        false,
      );
      assert.equal(
        service.canPerformTransition({ to: PurchaseRequestStatus.REJECTED, isRequester: false, isAdmin: true }),
        true,
      );
    });
  });

  describe('buildStatusTransitionUpdate', () => {
    test('APPROVED устанавливает reviewer и reviewedAt', () => {
      const update = service.buildStatusTransitionUpdate({
        targetStatus: PurchaseRequestStatus.APPROVED,
        actorId: 'reviewer-1',
      });
      assert.equal(update.status, PurchaseRequestStatus.APPROVED);
      assert.deepEqual((update as any).reviewer, { connect: { id: 'reviewer-1' } });
      assert.ok((update as any).reviewedAt instanceof Date);
    });

    test('SUBMITTED не трогает поля reviewer', () => {
      const update = service.buildStatusTransitionUpdate({
        targetStatus: PurchaseRequestStatus.SUBMITTED,
        actorId: 'requester-1',
      });
      assert.equal(update.status, PurchaseRequestStatus.SUBMITTED);
      assert.equal((update as any).reviewer, undefined);
      assert.equal((update as any).reviewedAt, undefined);
    });

    test('передаёт обрезанный resolutionComment, когда он указан', () => {
      const update = service.buildStatusTransitionUpdate({
        targetStatus: PurchaseRequestStatus.REJECTED,
        actorId: 'reviewer-1',
        resolutionComment: '  Недостаточно обоснования  ',
      });
      assert.equal(update.resolutionComment, 'Недостаточно обоснования');
    });

    test('не включает resolutionComment в payload, если параметр не передан', () => {
      const update = service.buildStatusTransitionUpdate({
        targetStatus: PurchaseRequestStatus.CANCELLED,
        actorId: 'user-1',
      });
      assert.equal('resolutionComment' in update, false);
    });
  });
});
