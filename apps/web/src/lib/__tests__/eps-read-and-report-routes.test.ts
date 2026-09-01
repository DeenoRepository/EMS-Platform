import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

let currentUser: JwtUserPayload | null = null;
let equipment: any = { id: 'equipment-1', name: 'Pump A', inventoryNumber: 'INV-1' };
let document: any = { id: 'document-1', equipmentId: 'equipment-1', filePath: 'documents/manual.pdf', originalName: 'manual.pdf', docType: 'MANUAL', equipment };
let photo: any = { id: 'photo-1', equipmentId: 'equipment-1', filePath: 'photos/pump.png', originalName: 'pump.png' };
let auditLogs: any[] = [];
let templates: any[] = [];
let reportTemplate: any = { id: 'template-1', createdById: 'owner-1', module: 'eps', name: 'Equipment report', config: { selectedColumns: ['name'] } };
let customFields: any[] = [];
let importAnalysis: any = { headers: ['Name'], rows: [{ Name: 'Pump A' }], suggestedMapping: { Name: 'name' } };
let deletedDocuments: any[] = [];
let deletedPhotos: any[] = [];
let savedFiles: any[] = [];
let createdDocuments: any[] = [];
let createdPhotos: any[] = [];
let auditEvents: any[] = [];
let auditCountCalls = 0;
let dashboardCounts = 0;

const viewer: JwtUserPayload = {
  userId: 'viewer-1',
  ldapLogin: 'viewer',
  displayName: 'Viewer',
  roles: ['viewer'],
  permissions: [PERMISSIONS.EPS_EQUIPMENT_VIEW, PERMISSIONS.EPS_HISTORY_VIEW, PERMISSIONS.EPS_REPORTS_VIEW],
};

const editor: JwtUserPayload = {
  userId: 'editor-1',
  ldapLogin: 'editor',
  displayName: 'Editor',
  roles: ['engineer'],
  permissions: [
    PERMISSIONS.EPS_EQUIPMENT_VIEW,
    PERMISSIONS.EPS_EQUIPMENT_EDIT,
    PERMISSIONS.EPS_DOCUMENTS_UPLOAD,
    PERMISSIONS.EPS_IMPORT_EXECUTE,
    PERMISSIONS.EPS_REPORTS_VIEW,
    PERMISSIONS.EPS_REPORTS_MANAGE,
    PERMISSIONS.EPS_HISTORY_VIEW,
  ],
};

function hasPermission(user: JwtUserPayload | null, permission: string): boolean {
  return Boolean(user && (user.roles.includes('admin') || user.permissions.includes(permission)));
}

const prismaMock = {
  equipment: {
    findUnique: async () => equipment,
    findMany: async () => [equipment],
    count: async () => { dashboardCounts += 1; return 1; },
  },
  document: {
    findUnique: async () => document,
    delete: async (args: unknown) => { deletedDocuments.push(args); return document; },
    create: async (args: unknown) => { createdDocuments.push(args); return { id: 'created-document', ...(args as any).data }; },
  },
  photo: {
    findUnique: async () => photo,
    delete: async (args: unknown) => { deletedPhotos.push(args); return photo; },
    create: async (args: unknown) => { createdPhotos.push(args); return { id: 'created-photo', ...(args as any).data }; },
    updateMany: async () => ({ count: 1 }),
  },
  auditLog: {
    findMany: async (args?: unknown) => {
      auditCountCalls += 1;
      return auditLogs;
    },
    count: async () => auditLogs.length,
  },
  customFieldDefinition: {
    findMany: async () => customFields,
  },
  reportTemplate: {
    findMany: async () => templates,
    create: async (args: unknown) => ({ id: 'template-created', ...(args as any).data }),
    findUnique: async () => reportTemplate,
    delete: async (args: unknown) => ({ id: (args as any).where.id }),
  },
  equipmentApproval: { count: async () => 0 },
  warehouse: { findMany: async () => [], count: async () => 0 },
  nomenclature: { count: async () => 0 },
  inventory: { count: async () => 0 },
  stockItem: { findMany: async () => [] },
  jiraIssueCache: { count: async () => 0, findMany: async () => [] },
  maintenanceSchedule: { count: async () => 0, findMany: async () => [] },
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock } });
mock.module('@ems/shared', { namedExports: { PERMISSIONS } });
mock.module('@ems/auth', {
  namedExports: {
    hasPermission,
    logAuditEvent: async (event: unknown) => { auditEvents.push(event); },
  },
});
mock.module('@/lib/rate-limit', { namedExports: { enforceRateLimit: async () => null } });
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    isAdminUser: (user: JwtUserPayload) => user.roles.includes('admin') || user.roles.includes('administrator'),
    unauthorizedResponse: () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false, error: 'Forbidden' }, { status: 403 }),
  },
});
mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, message: string) => Response.json({ success: false, error: message }, { status: 500 }),
  },
});
mock.module('@/lib/logger', {
  namedExports: { logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } },
});
mock.module('@/lib/storage', {
  namedExports: {
    saveFile: async (file: File, folder: string) => {
      const saved = { fileName: `${folder}-stored-${file.name}`, originalName: file.name, filePath: `${folder}/${file.name}`, fileType: file.type, fileSize: file.size };
      savedFiles.push({ file, folder, saved });
      return saved;
    },
    deleteFile: (filePath: string) => { savedFiles.push({ deleted: filePath }); return true; },
  },
});
mock.module('@/lib/eps-import-matcher', {
  namedExports: {
    analyzeEquipmentImportFile: async () => importAnalysis,
  },
});

interface RouteContext { params: Promise<{ id: string }> }
type RequestHandler = (request: Request) => Promise<Response>;
type IdHandler = (request: Request, context: RouteContext) => Promise<Response>;
const handlers: Record<string, RequestHandler | IdHandler> = {};

before(async () => {
  const dashboard = await import('@/app/api/dashboard/stats/route');
  const history = await import('@/app/api/eps/history/route');
  const documentById = await import('@/app/api/eps/documents/[id]/route');
  const equipmentAudit = await import('@/app/api/eps/equipment/[id]/audit/route');
  const equipmentDocuments = await import('@/app/api/eps/equipment/[id]/documents/route');
  const equipmentPhotos = await import('@/app/api/eps/equipment/[id]/photos/route');
  const importAnalyze = await import('@/app/api/eps/import/analyze/route');
  const importTemplate = await import('@/app/api/eps/import/template/route');
  const reportTemplates = await import('@/app/api/eps/reports/templates/route');
  const reportTemplateById = await import('@/app/api/eps/reports/templates/[id]/route');

  handlers.dashboard = dashboard.GET as unknown as RequestHandler;
  handlers.history = history.GET as unknown as RequestHandler;
  handlers.documentById = documentById.DELETE as unknown as IdHandler;
  handlers.equipmentAudit = equipmentAudit.GET as unknown as IdHandler;
  handlers.equipmentDocuments = equipmentDocuments.POST as unknown as IdHandler;
  handlers.equipmentDocumentsDelete = equipmentDocuments.DELETE as unknown as IdHandler;
  handlers.equipmentPhotos = equipmentPhotos.POST as unknown as IdHandler;
  handlers.equipmentPhotosDelete = equipmentPhotos.DELETE as unknown as IdHandler;
  handlers.importAnalyze = importAnalyze.POST as unknown as RequestHandler;
  handlers.importTemplate = importTemplate.GET as unknown as RequestHandler;
  handlers.reportTemplates = reportTemplates.GET as unknown as RequestHandler;
  handlers.reportTemplatesPost = reportTemplates.POST as unknown as RequestHandler;
  handlers.reportTemplateDelete = reportTemplateById.DELETE as unknown as IdHandler;
});

beforeEach(() => {
  currentUser = null;
  equipment = { id: 'equipment-1', name: 'Pump A', inventoryNumber: 'INV-1' };
  document = { id: 'document-1', equipmentId: 'equipment-1', filePath: 'documents/manual.pdf', originalName: 'manual.pdf', docType: 'MANUAL', equipment };
  photo = { id: 'photo-1', equipmentId: 'equipment-1', filePath: 'photos/pump.png', originalName: 'pump.png' };
  auditLogs = [{ id: 'audit-1', entityType: 'Equipment', entityId: 'equipment-1', changes: { name: { new: 'Pump A' } }, user: null }];
  templates = [{ ...reportTemplate, isPublic: true }];
  customFields = [{ name: 'Wear', unit: '%', fieldType: 'NUMBER', sortOrder: 1, defaultValue: '0' }];
  importAnalysis = { data: { headers: ['Name'], rows: [{ Name: 'Pump A' }], suggestedMapping: { Name: 'name' } } };
  deletedDocuments = [];
  deletedPhotos = [];
  savedFiles = [];
  createdDocuments = [];
  createdPhotos = [];
  auditEvents = [];
  auditCountCalls = 0;
  dashboardCounts = 0;
});

function request(method: string, body?: unknown, searchParams?: Record<string, string>, formData?: FormData) {
  return makeRequest({ method, body, searchParams, formData, url: 'http://localhost:3000/api/o4-eps-test' });
}

function context(id = 'equipment-1'): RouteContext {
  return { params: Promise.resolve({ id }) };
}

describe('O4 EPS and dashboard route contracts', { concurrency: false }, () => {
  test('protects dashboard and EPS history with authentication and permissions', async () => {
    assert.equal(await (handlers.dashboard as RequestHandler)(request('GET')).then((response) => response.status), 401);
    assert.equal(await (handlers.history as RequestHandler)(request('GET')).then((response) => response.status), 401);

    currentUser = { ...viewer, permissions: [] };
    assert.equal(await (handlers.history as RequestHandler)(request('GET')).then((response) => response.status), 403);

    currentUser = viewer;
    const dashboard = await (handlers.dashboard as RequestHandler)(request('GET'));
    const dashboardBody = await dashboard.json() as { success: boolean; data: { scope: string; eps: { total: number } } };
    assert.equal(dashboard.status, 200);
    assert.equal(dashboardBody.success, true);
    assert.equal(dashboardBody.data.scope, 'ENTERPRISE');
    assert.equal(dashboardBody.data.eps.total, 1);

    const history = await (handlers.history as RequestHandler)(request('GET', undefined, { page: '0', pageSize: '500', search: ' Pump ' }));
    const historyBody = await history.json() as { success: boolean; data: { page: number; pageSize: number; items: any[] } };
    assert.equal(history.status, 200);
    assert.equal(historyBody.data.page, 1);
    assert.equal(historyBody.data.pageSize, 100);
    assert.equal(historyBody.data.items[0].equipment.id, 'equipment-1');
    assert.ok(auditCountCalls >= 2);
  });

  test('deletes an EPS document only with edit/upload permission', async () => {
    const anonymous = await (handlers.documentById as IdHandler)(request('DELETE'), context('document-1'));
    assert.equal(anonymous.status, 401);

    currentUser = viewer;
    const forbidden = await (handlers.documentById as IdHandler)(request('DELETE'), context('document-1'));
    assert.equal(forbidden.status, 403);

    currentUser = editor;
    const response = await (handlers.documentById as IdHandler)(request('DELETE'), context('document-1'));
    assert.equal(response.status, 200);
    assert.deepEqual(deletedDocuments[0], { where: { id: 'document-1' } });
    assert.equal(savedFiles.some((entry) => entry.deleted === 'documents/manual.pdf'), true);
    assert.equal(auditEvents[0].entityType, 'EquipmentDocument');
  });

  test('returns equipment audit logs and handles missing equipment audit records', async () => {
    currentUser = viewer;
    const response = await (handlers.equipmentAudit as IdHandler)(request('GET'), context('equipment-1'));
    const body = await response.json() as { success: boolean; data: any[] };
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);

    auditLogs = [];
    const empty = await (handlers.equipmentAudit as IdHandler)(request('GET'), context('equipment-1'));
    assert.equal(empty.status, 200);
    assert.deepEqual((await empty.json()).data, []);
  });

  test('validates and uploads documents and primary photos', async () => {
    currentUser = editor;
    const emptyDocument = await (handlers.equipmentDocuments as IdHandler)(request('POST', undefined, undefined, new FormData()), context('equipment-1'));
    assert.equal(emptyDocument.status, 400);
    assert.equal(createdDocuments.length, 0);

    const documentForm = new FormData();
    documentForm.set('file', new File(['pdf'], 'manual.pdf', { type: 'application/pdf' }));
    documentForm.set('docType', 'MANUAL');
    documentForm.set('description', '  Operating manual  ');
    const documentResponse = await (handlers.equipmentDocuments as IdHandler)(request('POST', undefined, undefined, documentForm), context('equipment-1'));
    assert.equal(documentResponse.status, 200);
    assert.equal(createdDocuments[0].data.description, 'Operating manual');

    const photoForm = new FormData();
    photoForm.set('file', new File(['png'], 'pump.png', { type: 'image/png' }));
    photoForm.set('isPrimary', 'true');
    const photoResponse = await (handlers.equipmentPhotos as IdHandler)(request('POST', undefined, undefined, photoForm), context('equipment-1'));
    assert.equal(photoResponse.status, 200);
    assert.equal(createdPhotos[0].data.isPrimary, true);
  });

  test('deletes documents and photos with required identifiers and permissions', async () => {
    currentUser = editor;
    assert.equal((await (handlers.equipmentDocumentsDelete as IdHandler)(request('DELETE'), context('equipment-1'))).status, 400);
    assert.equal((await (handlers.equipmentPhotosDelete as IdHandler)(request('DELETE'), context('equipment-1'))).status, 400);

    const documentResponse = await (handlers.equipmentDocumentsDelete as IdHandler)(request('DELETE', undefined, { documentId: 'document-1' }), context('equipment-1'));
    const photoResponse = await (handlers.equipmentPhotosDelete as IdHandler)(request('DELETE', undefined, { photoId: 'photo-1' }), context('equipment-1'));
    assert.equal(documentResponse.status, 200);
    assert.equal(photoResponse.status, 200);
    assert.equal(deletedDocuments.length, 1);
    assert.equal(deletedPhotos.length, 1);
  });

  test('analyzes import files and returns an XLSX template', async () => {
    currentUser = viewer;
    const noFile = await (handlers.importAnalyze as RequestHandler)(request('POST', undefined, undefined, new FormData()));
    assert.equal(noFile.status, 400);

    const form = new FormData();
    form.set('file', new File(['csv'], 'equipment.csv', { type: 'text/csv' }));
    const analyzed = await (handlers.importAnalyze as RequestHandler)(request('POST', undefined, undefined, form));
    assert.equal(analyzed.status, 200);
    assert.deepEqual((await analyzed.json()).data, importAnalysis.data);

    const template = await (handlers.importTemplate as RequestHandler)(request('GET'));
    assert.equal(template.status, 200);
    assert.equal(template.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok((await template.arrayBuffer()).byteLength > 0);
  });

  test('lists, creates, and owner-deletes report templates', async () => {
    currentUser = viewer;
    assert.equal((await (handlers.reportTemplates as RequestHandler)(request('GET'))).status, 200);

    currentUser = editor;
    const invalid = await (handlers.reportTemplatesPost as RequestHandler)(request('POST', { name: ' ', config: {} }));
    assert.equal(invalid.status, 400);

    const created = await (handlers.reportTemplatesPost as RequestHandler)(request('POST', {
      name: '  New report  ', description: '  Description  ', config: { selectedColumns: ['name'] }, isPublic: false,
    }));
    const createdBody = await created.json() as { success: boolean; data: any };
    assert.equal(created.status, 200);
    assert.equal(createdBody.data.name, 'New report');

    currentUser = { ...viewer, userId: 'not-owner' };
    const forbidden = await (handlers.reportTemplateDelete as IdHandler)(request('DELETE'), context('template-1'));
    assert.equal(forbidden.status, 403);

    currentUser = { ...viewer, userId: 'owner-1' };
    const deleted = await (handlers.reportTemplateDelete as IdHandler)(request('DELETE'), context('template-1'));
    assert.equal(deleted.status, 200);
  });
});
