/**
 * N9 phase 3: executable contracts for previously-untested read/write routes —
 * modules status, users list, WMS categories, EPS custom fields/sections,
 * notifications list, and MRO checklists/plans.
 */
import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { adminUser, makePrismaMock, makeRequest } from './helpers/route-harness';

const prismaMock = makePrismaMock();
let currentUser: JwtUserPayload | null = null;
let auditCalls = 0;

const forbiddenUser: JwtUserPayload = {
  userId: 'forbidden-id',
  ldapLogin: 'forbidden',
  displayName: 'Forbidden',
  roles: ['viewer'],
  permissions: [],
};

const equipmentViewerUser: JwtUserPayload = {
  userId: 'viewer-id',
  ldapLogin: 'viewer',
  displayName: 'Viewer',
  roles: ['engineer'],
  permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW],
};

const mroUser: JwtUserPayload = {
  userId: 'mro-id',
  ldapLogin: 'mro.user',
  displayName: 'MRO User',
  roles: ['mechanic'],
  permissions: [PERMISSIONS.MRO_SCHEDULE_VIEW, PERMISSIONS.MRO_SCHEDULE_MANAGE],
};

const wmsUser: JwtUserPayload = {
  userId: 'wms-id',
  ldapLogin: 'wms.user',
  displayName: 'WMS User',
  roles: ['storekeeper'],
  permissions: [PERMISSIONS.WMS_STOCK_VIEW, PERMISSIONS.WMS_NOMENCLATURE_MANAGE],
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock, FieldType: { TEXT: 'TEXT', NUMBER: 'NUMBER', DATE: 'DATE', BOOLEAN: 'BOOLEAN' } } });
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/logger', {
  namedExports: { logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } },
});
mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, publicError: string) =>
      Response.json({ success: false, error: publicError }, { status: 500 }),
  },
});
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    unauthorizedResponse: () => Response.json({ success: false }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false }, { status: 403 }),
    isAdminUser: (user: JwtUserPayload) => user.roles.some((role) => role === 'admin' || role === 'administrator'),
    requireAuth: async (_request: Request, permissions: string | string[]) => {
      if (!currentUser) {
        return { errorResponse: Response.json({ success: false }, { status: 401 }) };
      }
      const required = Array.isArray(permissions) ? permissions : [permissions];
      if (!required.some((permission) => currentUser?.permissions.includes(permission))) {
        return { errorResponse: Response.json({ success: false }, { status: 403 }) };
      }
      return { user: currentUser };
    },
  },
});
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: JwtUserPayload, permission: string) => user.permissions.includes(permission),
    logAuditEvent: async () => {
      auditCalls += 1;
    },
  },
});

type Handler = (request: Request) => Promise<Response>;
const handlers: Record<string, Handler> = {};

before(async () => {
  const moduleStatus = await import('@/app/api/modules/status/route');
  const users = await import('@/app/api/users/route');
  const wmsCategories = await import('@/app/api/wms/categories/route');
  const customFields = await import('@/app/api/eps/custom-fields/route');
  const customSections = await import('@/app/api/eps/custom-sections/route');
  const notifications = await import('@/app/api/notifications/route');
  const mroChecklists = await import('@/app/api/mro/checklists/route');
  const mroPlans = await import('@/app/api/mro/plans/route');

  handlers.moduleStatusGET = moduleStatus.GET as unknown as Handler;
  handlers.moduleStatusPATCH = moduleStatus.PATCH as unknown as Handler;
  handlers.usersGET = users.GET as unknown as Handler;
  handlers.categoriesGET = wmsCategories.GET as unknown as Handler;
  handlers.categoriesPOST = wmsCategories.POST as unknown as Handler;
  handlers.customFieldsGET = customFields.GET as unknown as Handler;
  handlers.customFieldsPOST = customFields.POST as unknown as Handler;
  handlers.customFieldsDELETE = customFields.DELETE as unknown as Handler;
  handlers.customSectionsGET = customSections.GET as unknown as Handler;
  handlers.customSectionsPOST = customSections.POST as unknown as Handler;
  handlers.notificationsGET = notifications.GET as unknown as Handler;
  handlers.checklistsGET = mroChecklists.GET as unknown as Handler;
  handlers.checklistsPOST = mroChecklists.POST as unknown as Handler;
  handlers.plansGET = mroPlans.GET as unknown as Handler;
  handlers.plansPOST = mroPlans.POST as unknown as Handler;
});

beforeEach(() => {
  currentUser = null;
  auditCalls = 0;
  prismaMock.systemSetting.findUnique = async () => null;
  prismaMock.systemSetting.upsert = async () => ({ id: 'setting-id' });
  prismaMock.user.findMany = async () => [];
  prismaMock.nomenclatureCategory.findMany = async () => [];
  prismaMock.nomenclatureCategory.create = async () => ({ id: 'category-id', name: 'Category' });
  prismaMock.customFieldDefinition.findMany = async () => [];
  prismaMock.customFieldDefinition.upsert = async () => ({ id: 'field-id', key: 'field' });
  prismaMock.customFieldDefinition.delete = async () => ({ id: 'field-id' });
  prismaMock.customSection.findMany = async () => [{ id: 'section-1', code: 'general', name: 'General', fields: [] }];
  prismaMock.customSection.create = async () => ({ id: 'section-id', code: 'section', name: 'Section' });
  prismaMock.customSection.findUnique = async () => null;
  prismaMock.notification.findMany = async () => [];
  prismaMock.notification.count = async () => 0;
  prismaMock.checklistTemplate.findMany = async () => [];
  prismaMock.checklistTemplate.create = async () => ({ id: 'checklist-id', name: 'Checklist' });
  prismaMock.maintenancePlan.findMany = async () => [];
  prismaMock.maintenancePlan.create = async () => ({ id: 'plan-id', name: 'Plan' });
});

describe('GET /api/modules/status', () => {
  test('returns 401 anonymously', async () => {
    assert.equal((await handlers.moduleStatusGET(makeRequest())).status, 401);
  });

  test('returns 403 without admin-settings permission', async () => {
    currentUser = forbiddenUser;
    assert.equal((await handlers.moduleStatusGET(makeRequest())).status, 403);
  });

  test('returns default module status for an administrator', async () => {
    currentUser = adminUser;
    const response = await handlers.moduleStatusGET(makeRequest());
    const body = (await response.json()) as { success: boolean; data: { eps: boolean } };
    assert.equal(response.status, 200);
    assert.equal(body.data.eps, true);
  });
});

describe('PATCH /api/modules/status', () => {
  test('returns 401 anonymously', async () => {
    assert.equal((await handlers.moduleStatusPATCH(makeRequest({ method: 'PATCH', body: { moduleId: 'eps', enabled: false } }))).status, 401);
  });

  test('returns 400 for an unknown moduleId', async () => {
    currentUser = adminUser;
    const response = await handlers.moduleStatusPATCH(makeRequest({ method: 'PATCH', body: { moduleId: 'unknown', enabled: false } }));
    assert.equal(response.status, 400);
  });

  test('toggles a module and audits the change for an administrator', async () => {
    currentUser = adminUser;
    const response = await handlers.moduleStatusPATCH(makeRequest({ method: 'PATCH', body: { moduleId: 'wms', enabled: false } }));
    assert.equal(response.status, 200);
    assert.equal(auditCalls, 1);
  });
});

describe('GET /api/users', () => {
  test('returns 401 anonymously', async () => {
    assert.equal((await handlers.usersGET(makeRequest())).status, 401);
  });

  test('returns 403 without any viewing permission', async () => {
    currentUser = { ...forbiddenUser, roles: [] };
    assert.equal((await handlers.usersGET(makeRequest())).status, 403);
  });

  test('returns 200 for a user with equipment view permission', async () => {
    currentUser = equipmentViewerUser;
    const response = await handlers.usersGET(makeRequest());
    assert.equal(response.status, 200);
  });
});

describe('WMS categories routes', () => {
  test('GET returns 401 anonymously and 403 without stock view permission', async () => {
    assert.equal((await handlers.categoriesGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.categoriesGET(makeRequest())).status, 403);
  });

  test('GET returns 200 for a user with stock view permission', async () => {
    currentUser = wmsUser;
    assert.equal((await handlers.categoriesGET(makeRequest())).status, 200);
  });

  test('POST returns 403 without nomenclature-management permission', async () => {
    currentUser = { ...wmsUser, permissions: [PERMISSIONS.WMS_STOCK_VIEW] };
    const response = await handlers.categoriesPOST(makeRequest({ method: 'POST', body: { name: 'New' } }));
    assert.equal(response.status, 403);
  });

  test('POST returns 400 when name is missing and 200 when valid', async () => {
    currentUser = wmsUser;
    const invalid = await handlers.categoriesPOST(makeRequest({ method: 'POST', body: { name: '  ' } }));
    assert.equal(invalid.status, 400);

    const valid = await handlers.categoriesPOST(makeRequest({ method: 'POST', body: { name: 'Bearings' } }));
    assert.equal(valid.status, 200);
  });
});

describe('EPS custom fields routes', () => {
  test('GET requires authentication and equipment-view permission', async () => {
    assert.equal((await handlers.customFieldsGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.customFieldsGET(makeRequest())).status, 403);
    currentUser = equipmentViewerUser;
    assert.equal((await handlers.customFieldsGET(makeRequest())).status, 200);
  });

  test('POST requires custom-fields-manage permission and validates required fields', async () => {
    currentUser = adminUser;
    assert.equal((await handlers.customFieldsPOST(makeRequest({ method: 'POST', body: {} }))).status, 400);

    const created = await handlers.customFieldsPOST(
      makeRequest({ method: 'POST', body: { key: 'voltage', name: 'Voltage', fieldType: 'NUMBER' } }),
    );
    assert.equal(created.status, 200);
    assert.equal(auditCalls, 1);
  });

  test('DELETE requires an id and succeeds for an administrator', async () => {
    currentUser = adminUser;
    assert.equal((await handlers.customFieldsDELETE(makeRequest({ method: 'DELETE' }))).status, 400);

    const response = await handlers.customFieldsDELETE(
      makeRequest({ method: 'DELETE', searchParams: { id: 'field-1' } }),
    );
    assert.equal(response.status, 200);
    assert.equal(auditCalls, 1);
  });
});

describe('EPS custom sections routes', () => {
  test('GET requires authentication and either view or manage permission', async () => {
    assert.equal((await handlers.customSectionsGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.customSectionsGET(makeRequest())).status, 403);
    currentUser = equipmentViewerUser;
    assert.equal((await handlers.customSectionsGET(makeRequest())).status, 200);
  });

  test('POST validates the section name and rejects a duplicate code', async () => {
    currentUser = adminUser;
    assert.equal((await handlers.customSectionsPOST(makeRequest({ method: 'POST', body: {} }))).status, 400);

    prismaMock.customSection.findUnique = async () => ({ id: 'existing', code: 'electrical' });
    const duplicate = await handlers.customSectionsPOST(makeRequest({ method: 'POST', body: { name: 'Electrical' } }));
    assert.equal(duplicate.status, 409);

    prismaMock.customSection.findUnique = async () => null;
    const created = await handlers.customSectionsPOST(makeRequest({ method: 'POST', body: { name: 'New Section' } }));
    assert.equal(created.status, 201);
  });
});

describe('GET /api/notifications', () => {
  test('returns 401 anonymously and 200 with unread count for an authenticated user', async () => {
    assert.equal((await handlers.notificationsGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    const response = await handlers.notificationsGET(makeRequest());
    const body = (await response.json()) as { success: boolean; data: { unreadCount: number } };
    assert.equal(response.status, 200);
    assert.equal(body.data.unreadCount, 0);
  });
});

describe('MRO checklists and plans routes', () => {
  test('checklists GET/POST require MRO permissions and validate a name', async () => {
    assert.equal((await handlers.checklistsGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.checklistsGET(makeRequest())).status, 403);
    currentUser = mroUser;
    assert.equal((await handlers.checklistsGET(makeRequest())).status, 200);

    const invalid = await handlers.checklistsPOST(makeRequest({ method: 'POST', body: {} }));
    assert.equal(invalid.status, 400);
    const created = await handlers.checklistsPOST(makeRequest({ method: 'POST', body: { name: 'Monthly Checklist' } }));
    assert.ok(created.status === 200 || created.status === 201);
  });

  test('plans GET/POST require MRO permissions and validate required fields', async () => {
    assert.equal((await handlers.plansGET(makeRequest())).status, 401);
    currentUser = forbiddenUser;
    assert.equal((await handlers.plansGET(makeRequest())).status, 403);
    currentUser = mroUser;
    assert.equal((await handlers.plansGET(makeRequest())).status, 200);

    const invalid = await handlers.plansPOST(makeRequest({ method: 'POST', body: {} }));
    assert.equal(invalid.status, 400);
    const created = await handlers.plansPOST(
      makeRequest({ method: 'POST', body: { equipmentId: 'e1', name: 'Plan', frequency: 'MONTHLY' } }),
    );
    assert.equal(created.status, 201);
  });
});
