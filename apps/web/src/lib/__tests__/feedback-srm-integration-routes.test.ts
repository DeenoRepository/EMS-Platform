import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

let currentUser: JwtUserPayload | null = null;
let tickets: any[] = [];
let ticket: any = null;
let integrations: any[] = [];
let integration: any = null;
let feedbackCreates: any[] = [];
let feedbackUpdates: any[] = [];
let feedbackDeletes: any[] = [];
let comments: any[] = [];
let commentCreates: any[] = [];
let notifications: any[] = [];
let integrationCreates: any[] = [];
let integrationUpdates: any[] = [];
let integrationDeletes: any[] = [];
let issueCacheDeletes: any[] = [];
let mappingValue: any = null;
let mappingWrites: any[] = [];
let auditEvents: any[] = [];
let adapterCalls: any[] = [];

const viewer: JwtUserPayload = {
  userId: 'viewer-1', ldapLogin: 'viewer', displayName: 'Viewer', roles: ['viewer'], permissions: [],
};
const feedbackOwner: JwtUserPayload = {
  userId: 'owner-1', ldapLogin: 'owner', displayName: 'Owner', roles: ['engineer'], permissions: [],
};
const feedbackAdmin: JwtUserPayload = {
  userId: 'admin-1', ldapLogin: 'admin', displayName: 'Admin', roles: ['admin'], permissions: [PERMISSIONS.ADMIN_FEEDBACK_MANAGE, PERMISSIONS.ADMIN_SETTINGS_MANAGE, PERMISSIONS.SRM_DASHBOARD_VIEW, PERMISSIONS.SRM_SYNC_TRIGGER],
};

function hasPermission(user: JwtUserPayload | null, permission: string): boolean {
  return Boolean(user && (user.roles.includes('admin') || user.permissions.includes(permission)));
}

const prismaMock = {
  feedbackTicket: {
    count: async () => tickets.length,
    findMany: async () => tickets,
    findUnique: async () => ticket,
    create: async (args: unknown) => { feedbackCreates.push(args); return { ...ticket, ...(args as any).data, id: 'ticket-created' }; },
    update: async (args: unknown) => { feedbackUpdates.push(args); return { ...ticket, ...(args as any).data }; },
  },
  feedbackComment: {
    create: async (args: unknown) => { commentCreates.push(args); return { id: 'comment-1', ...(args as any).data }; },
  },
  feedbackAttachment: { create: async () => ({ id: 'attachment-1' }) },
  user: { findMany: async () => [{ id: 'admin-2' }] },
  notification: { create: async (args: unknown) => { notifications.push(args); return { id: 'notification-1' }; } },
  srmIntegration: {
    findMany: async () => integrations,
    findUnique: async () => integration,
    create: async (args: unknown) => { integrationCreates.push(args); return { ...integration, ...(args as any).data, id: 'integration-created' }; },
    update: async (args: unknown) => { integrationUpdates.push(args); return { ...integration, ...(args as any).data }; },
    updateMany: async () => ({ count: 1 }),
    delete: async (args: unknown) => { integrationDeletes.push(args); return { id: (args as any).where.id }; },
  },
  jiraIssueCache: { deleteMany: async (args: unknown) => { issueCacheDeletes.push(args); return { count: 1 }; } },
  systemSetting: {
    findUnique: async () => mappingValue ? { key: 'srm_jira_field_mapping', value: JSON.stringify(mappingValue) } : null,
    upsert: async (args: unknown) => { mappingWrites.push(args); return { id: 'mapping-1' }; },
  },
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
    requireAuth: async (_request: Request, permission: string | string[]) => {
      if (!currentUser) return { errorResponse: Response.json({ success: false }, { status: 401 }) };
      const required = Array.isArray(permission) ? permission : [permission];
      return required.some((code) => hasPermission(currentUser, code))
        ? { user: currentUser }
        : { errorResponse: Response.json({ success: false }, { status: 403 }) };
    },
    unauthorizedResponse: () => Response.json({ success: false }, { status: 401 }),
    forbiddenResponse: (message = 'Forbidden') => Response.json({ success: false, error: message }, { status: 403 }),
  },
});
mock.module('@/lib/safe-error', {
  namedExports: { safeErrorResponse: (_error: unknown, message: string) => Response.json({ success: false, error: message }, { status: 500 }) },
});
mock.module('@/lib/logger', { namedExports: { logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } } });
mock.module('@/lib/storage', {
  namedExports: {
    saveFile: async (file: File) => ({ fileName: file.name, originalName: file.name, filePath: `feedback/${file.name}`, fileType: file.type, fileSize: file.size }),
  },
});
mock.module('@/lib/jira-service', {
  namedExports: {
    DEFAULT_JIRA_FIELD_MAPPING: {
      standardMappings: [], customMappings: [], equipmentMatching: { sourcePath: 'key', matchBy: 'name' },
      statusMapping: {}, priorityMapping: {},
    },
    getJiraFieldMapping: async () => mappingValue || {
      standardMappings: [], customMappings: [], equipmentMatching: { sourcePath: 'key', matchBy: 'name' },
      statusMapping: {}, priorityMapping: {},
    },
    saveJiraFieldMapping: async (value: unknown) => {
      mappingWrites.push(value);
      return value;
    },
    testJiraFieldMapping: async (sampleIssue: unknown) => ({
      success: true, mapped: sampleIssue, customFields: {}, diagnostics: [],
    }),
  },
});
mock.module('@/lib/srm-providers', {
  namedExports: {
    getAvailableSrmProviders: () => [{ type: 'JIRA', name: 'Jira' }],
    hasSecureSrmWebhookAuth: (authConfig: any) => Boolean(authConfig?.secret || authConfig?.webhookSecret || authConfig?.allowUnsigned === true),
    sanitizeAuthConfig: (authConfig: any) => ({ ...authConfig, token: authConfig?.token ? '••••••••' : authConfig?.token }),
    mergeAuthConfig: (next: any, existing: any) => ({ ...existing, ...next, token: next?.token === '••••••••' ? existing?.token : next?.token }),
    getSrmAdapter: (providerType: string) => ({ testConnection: async (value: unknown) => { adapterCalls.push({ providerType, value }); return { success: true, message: 'Connected' }; } }),
  },
});

interface RouteContext { params: Promise<{ id: string }> }
type RequestHandler = (request: Request) => Promise<Response>;
type IdHandler = (request: Request, context: RouteContext) => Promise<Response>;
const handlers: Record<string, RequestHandler | IdHandler> = {};

before(async () => {
  const feedback = await import('@/app/api/feedback/route');
  const feedbackId = await import('@/app/api/feedback/[id]/route');
  const feedbackComments = await import('@/app/api/feedback/[id]/comments/route');
  const integrationsRoute = await import('@/app/api/srm/integrations/route');
  const integrationId = await import('@/app/api/srm/integrations/[id]/route');
  const integrationTest = await import('@/app/api/srm/integrations/[id]/test/route');
  const mapping = await import('@/app/api/srm/mapping/route');
  const mappingTest = await import('@/app/api/srm/mapping/test/route');

  handlers.feedbackGET = feedback.GET as unknown as RequestHandler;
  handlers.feedbackPOST = feedback.POST as unknown as RequestHandler;
  handlers.feedbackIdGET = feedbackId.GET as unknown as IdHandler;
  handlers.feedbackIdPATCH = feedbackId.PATCH as unknown as IdHandler;
  handlers.feedbackIdDELETE = feedbackId.DELETE as unknown as IdHandler;
  handlers.commentsPOST = feedbackComments.POST as unknown as IdHandler;
  handlers.integrationsGET = integrationsRoute.GET as unknown as RequestHandler;
  handlers.integrationsPOST = integrationsRoute.POST as unknown as RequestHandler;
  handlers.integrationGET = integrationId.GET as unknown as IdHandler;
  handlers.integrationPUT = integrationId.PUT as unknown as IdHandler;
  handlers.integrationDELETE = integrationId.DELETE as unknown as IdHandler;
  handlers.integrationTest = integrationTest.POST as unknown as IdHandler;
  handlers.mappingGET = mapping.GET as unknown as RequestHandler;
  handlers.mappingPUT = mapping.PUT as unknown as RequestHandler;
  handlers.mappingTest = mappingTest.POST as unknown as RequestHandler;
});

beforeEach(() => {
  currentUser = null;
  tickets = [{ id: 'ticket-1', ticketNumber: 'FB-2026-0001', title: 'Bug', description: 'Details', createdById: 'owner-1', status: 'NEW', deletedAt: null, _count: { comments: 0, attachments: 0 } }];
  ticket = { ...tickets[0], createdBy: { id: 'owner-1', displayName: 'Owner' }, assignedTo: null, comments: [], attachments: [] };
  integrations = [];
  integration = { id: 'integration-1', name: 'Jira EMS', providerType: 'JIRA', baseUrl: 'https://jira.example.test', authConfig: { token: 'secret-token', secret: 'webhook-secret' }, isActive: true, isDefault: false };
  feedbackCreates = [];
  feedbackUpdates = [];
  feedbackDeletes = [];
  comments = [];
  commentCreates = [];
  notifications = [];
  integrationCreates = [];
  integrationUpdates = [];
  integrationDeletes = [];
  issueCacheDeletes = [];
  mappingValue = null;
  mappingWrites = [];
  auditEvents = [];
  adapterCalls = [];
});

function request(method: string, body?: unknown, searchParams?: Record<string, string>) {
  return makeRequest({ method, body, searchParams, url: 'http://localhost:3000/api/o4-feedback-srm-test' });
}
function context(id: string): RouteContext { return { params: Promise.resolve({ id }) }; }

const call = (name: string) => handlers[name] as RequestHandler;
const callId = (name: string) => handlers[name] as IdHandler;

describe('O4 feedback route contracts', { concurrency: false }, () => {
  test('scopes list access to own tickets for regular users and allows admin filtering', async () => {
    assert.equal((await call('feedbackGET')(request('GET'))).status, 401);
    currentUser = feedbackOwner;
    const own = await call('feedbackGET')(request('GET', undefined, { search: ' Bug ', onlyOwn: 'true' }));
    assert.equal(own.status, 200);
    currentUser = feedbackAdmin;
    const all = await call('feedbackGET')(request('GET'));
    assert.equal(all.status, 200);
  });

  test('creates a feedback ticket with a yearly sequence and rejects blank input', async () => {
    currentUser = feedbackOwner;
    const invalid = await call('feedbackPOST')(request('POST', { title: ' ', description: 'details' }));
    assert.equal(invalid.status, 400);
    assert.equal(feedbackCreates.length, 0);

    const response = await call('feedbackPOST')(request('POST', { title: '  Bug title ', description: '  Details ', type: 'BUG', module: 'EPS', priority: 'HIGH', pageUrl: '/eps' }));
    assert.equal(response.status, 200);
    assert.equal(feedbackCreates[0].data.ticketNumber, 'FB-2026-0002');
    assert.equal(feedbackCreates[0].data.title, 'Bug title');
    assert.equal(auditEvents[0].entityType, 'FeedbackTicket');
  });

  test('enforces feedback ownership and admin-only updates/deletes', async () => {
    currentUser = viewer;
    assert.equal((await callId('feedbackIdGET')(request('GET'), context('ticket-1'))).status, 403);
    assert.equal((await callId('feedbackIdPATCH')(request('PATCH', { status: 'RESOLVED' }), context('ticket-1'))).status, 403);
    assert.equal((await callId('feedbackIdDELETE')(request('DELETE'), context('ticket-1'))).status, 403);

    currentUser = feedbackAdmin;
    const updated = await callId('feedbackIdPATCH')(request('PATCH', { status: 'RESOLVED', resolution: 'Fixed' }), context('ticket-1'));
    assert.equal(updated.status, 200);
    assert.equal(feedbackUpdates[0].data.status, 'RESOLVED');
    assert.ok(feedbackUpdates[0].data.resolvedAt instanceof Date);
    const deleted = await callId('feedbackIdDELETE')(request('DELETE'), context('ticket-1'));
    assert.equal(deleted.status, 200);
  });

  test('allows owner comments but strips internal flag; admin may create internal comments', async () => {
    currentUser = feedbackOwner;
    const ownerComment = await callId('commentsPOST')(request('POST', { message: '  Public reply ', isInternal: true }), context('ticket-1'));
    assert.equal(ownerComment.status, 200);
    assert.equal(commentCreates[0].data.isInternal, false);

    currentUser = feedbackAdmin;
    const internal = await callId('commentsPOST')(request('POST', { message: 'Internal note', isInternal: true }), context('ticket-1'));
    assert.equal(internal.status, 200);
    assert.equal(commentCreates[1].data.isInternal, true);
  });
});

describe('O4 SRM integration and mapping route contracts', { concurrency: false }, () => {
  test('lists integrations with masked secrets and requires permissions for writes', async () => {
    integrations = [integration];
    currentUser = viewer;
    assert.equal((await call('integrationsGET')(request('GET'))).status, 403);
    currentUser = feedbackAdmin;
    const listed = await call('integrationsGET')(request('GET'));
    const body = await listed.json() as { data: { integrations: any[] } };
    assert.equal(listed.status, 200);
    assert.equal(body.data.integrations[0].authConfig.token, '••••••••');
    assert.equal(JSON.stringify(body).includes('secret-token'), false);

    const invalid = await call('integrationsPOST')(request('POST', { name: 'Jira', providerType: 'JIRA', baseUrl: 'https://jira.example.test', authType: 'BASIC', authConfig: {} }));
    assert.equal(invalid.status, 400);
    assert.equal(integrationCreates.length, 0);
  });

  test('creates and updates secure integrations while preserving masked tokens', async () => {
    currentUser = feedbackAdmin;
    const created = await call('integrationsPOST')(request('POST', {
      name: ' Jira ', providerType: 'JIRA', baseUrl: 'https://jira.example.test', authType: 'BASIC',
      authConfig: { secret: 'webhook-secret', token: 'api-token' }, isActive: true,
    }));
    assert.equal(created.status, 200);
    assert.equal(integrationCreates[0].data.name, 'Jira');

    const updated = await callId('integrationPUT')(request('PUT', { authConfig: { token: '••••••••' }, isActive: true }), context('integration-1'));
    assert.equal(updated.status, 200);
    assert.equal(integrationUpdates[0].data.authConfig.token, 'secret-token');
  });

  test('handles integration details, test, and deletion lifecycle', async () => {
    currentUser = feedbackAdmin;
    const detail = await callId('integrationGET')(request('GET'), context('integration-1'));
    assert.equal(detail.status, 200);
    assert.equal(JSON.stringify(await detail.json()).includes('secret-token'), false);

    const tested = await callId('integrationTest')(request('POST'), context('integration-1'));
    assert.equal(tested.status, 200);
    assert.equal(adapterCalls.length, 1);

    const deleted = await callId('integrationDELETE')(request('DELETE'), context('integration-1'));
    assert.equal(deleted.status, 200);
    assert.deepEqual(issueCacheDeletes[0].where, { integrationId: 'integration-1' });
    assert.deepEqual(integrationDeletes[0].where, { id: 'integration-1' });
  });

  test('gets, updates, and tests field mapping with permission guards', async () => {
    assert.equal((await call('mappingGET')(request('GET'))).status, 401);
    currentUser = viewer;
    assert.equal((await call('mappingGET')(request('GET'))).status, 403);
    currentUser = feedbackAdmin;
    const get = await call('mappingGET')(request('GET'));
    assert.equal(get.status, 200);
    const put = await call('mappingPUT')(request('PUT', { standardMappings: [], customMappings: [], equipmentMatching: {}, statusMapping: {}, priorityMapping: {} }));
    assert.equal(put.status, 200);
    assert.equal(mappingWrites.length, 1);
    const testResponse = await call('mappingTest')(request('POST', {
      sampleIssue: { key: 'EMS-1' },
      config: { standardMappings: [], customMappings: [], equipmentMatching: {}, statusMapping: {}, priorityMapping: {} },
    }));
    assert.equal(testResponse.status, 200);
  });
});
