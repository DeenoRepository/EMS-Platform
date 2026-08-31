/**
 * N5 Wave 3: executable tests for EPS approvals/documents and SRM issues.
 */
import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makePrismaMock, makeRequest } from './helpers/route-harness';

const prismaMock = makePrismaMock();
let currentUser: JwtUserPayload | null = null;
let auditCalls = 0;
let storageCalls = 0;

const authorizedUser: JwtUserPayload = {
  userId: 'eps-srm-user-id',
  ldapLogin: 'eps.srm.user',
  displayName: 'EPS SRM User',
  roles: ['engineer'],
  permissions: [
    PERMISSIONS.EPS_APPROVALS_VIEW,
    PERMISSIONS.EPS_APPROVALS_CREATE,
    PERMISSIONS.EPS_EQUIPMENT_EDIT,
    PERMISSIONS.EPS_DOCUMENTS_VIEW,
    PERMISSIONS.EPS_DOCUMENTS_UPLOAD,
    PERMISSIONS.SRM_DASHBOARD_VIEW,
    PERMISSIONS.SRM_REQUESTS_CREATE,
  ],
};

const forbiddenUser: JwtUserPayload = {
  userId: 'forbidden-id',
  ldapLogin: 'forbidden',
  displayName: 'Forbidden',
  roles: ['viewer'],
  permissions: [],
};

mock.module('@ems/database', {
  namedExports: {
    prisma: prismaMock,
    ApprovalStatus: { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED' },
    ApprovalType: { COMMISSIONING: 'COMMISSIONING', PARAMETER_CHANGE: 'PARAMETER_CHANGE', DECOMMISSIONING: 'DECOMMISSIONING' },
    DocumentType: { SCHEMA: 'SCHEMA', MANUAL: 'MANUAL', CERTIFICATE: 'CERTIFICATE', PASSPORT: 'PASSPORT', ACT: 'ACT', OTHER: 'OTHER' },
  },
});

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
mock.module('@/lib/storage', {
  namedExports: {
    saveFile: async (file: File) => {
      storageCalls += 1;
      return {
        fileName: 'stored-file.pdf',
        originalName: file.name,
        filePath: 'documents/stored-file.pdf',
        fileType: file.type,
        fileSize: file.size,
      };
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
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    unauthorizedResponse: () => Response.json({ success: false }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false }, { status: 403 }),
    isAdminUser: () => false,
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

class MockSrmNotConfiguredError extends Error {}
let createdIssue = {
  id: 'issue-id',
  issueKey: 'EMS-1',
  summary: 'Pump failure',
  priority: 'HIGH',
  equipmentId: null,
};
mock.module('@/lib/jira-service', {
  namedExports: {
    SrmNotConfiguredError: MockSrmNotConfiguredError,
    syncJiraIssues: async () => {},
    createInternalServiceRequest: async () => createdIssue,
  },
});

let approvalsGET: (request: Request) => Promise<Response>;
let approvalsPOST: (request: Request) => Promise<Response>;
let documentsGET: (request: Request) => Promise<Response>;
let documentsPOST: (request: Request) => Promise<Response>;
let issuesGET: (request: Request) => Promise<Response>;
let issuesPOST: (request: Request) => Promise<Response>;

before(async () => {
  const approvals = await import('@/app/api/eps/approvals/route');
  const documents = await import('@/app/api/eps/documents/route');
  const issues = await import('@/app/api/srm/issues/route');

  approvalsGET = approvals.GET as unknown as typeof approvalsGET;
  approvalsPOST = approvals.POST as unknown as typeof approvalsPOST;
  documentsGET = documents.GET as unknown as typeof documentsGET;
  documentsPOST = documents.POST as unknown as typeof documentsPOST;
  issuesGET = issues.GET as unknown as typeof issuesGET;
  issuesPOST = issues.POST as unknown as typeof issuesPOST;
});

beforeEach(() => {
  currentUser = null;
  auditCalls = 0;
  storageCalls = 0;
  prismaMock.equipment.findUnique = async () => ({ id: 'equipment-1', name: 'Pump A' });
  prismaMock.equipment.findMany = async () => [];
  prismaMock.equipmentApproval.count = async () => 0;
  prismaMock.equipmentApproval.findMany = async () => [];
  prismaMock.equipmentApproval.create = async () => ({ id: 'approval-1', status: 'PENDING' });
  prismaMock.document.count = async () => 0;
  prismaMock.document.findMany = async () => [];
  prismaMock.document.create = async () => ({ id: 'document-1', originalName: 'manual.pdf' });
  prismaMock.jiraIssueCache.count = async () => 1;
  prismaMock.jiraIssueCache.findMany = async () => [];
  prismaMock.auditLog.create = async () => {
    auditCalls += 1;
    return {};
  };
  createdIssue = {
    id: 'issue-id',
    issueKey: 'EMS-1',
    summary: 'Pump failure',
    priority: 'HIGH',
    equipmentId: null,
  };
});

describe('GET /api/eps/approvals', () => {
  test('returns 401 anonymously', async () => {
    assert.equal((await approvalsGET(makeRequest())).status, 401);
  });

  test('returns 403 without approval permissions', async () => {
    currentUser = forbiddenUser;
    assert.equal((await approvalsGET(makeRequest())).status, 403);
  });

  test('returns 200 with a paginated response for an authorized user', async () => {
    currentUser = authorizedUser;
    const response = await approvalsGET(makeRequest({ url: 'http://localhost/api/eps/approvals' }));
    const body = (await response.json()) as { success: boolean; data: { items: unknown[] } };
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.items, []);
  });
});

describe('POST /api/eps/approvals', () => {
  const validBody = { equipmentId: 'equipment-1', type: 'COMMISSIONING', title: 'Commission Pump' };

  test('returns 401 anonymously', async () => {
    assert.equal((await approvalsPOST(makeRequest({ method: 'POST', body: validBody }))).status, 401);
  });

  test('returns 403 without create or edit permission', async () => {
    currentUser = forbiddenUser;
    assert.equal((await approvalsPOST(makeRequest({ method: 'POST', body: validBody }))).status, 403);
  });

  test('returns 400 when required fields are missing', async () => {
    currentUser = authorizedUser;
    const response = await approvalsPOST(makeRequest({ method: 'POST', body: {} }));
    assert.equal(response.status, 400);
    assert.equal(auditCalls, 0);
  });

  test('creates an approval for an authorized user', async () => {
    currentUser = authorizedUser;
    const response = await approvalsPOST(makeRequest({ method: 'POST', body: validBody }));
    assert.equal(response.status, 200);
    assert.equal(auditCalls, 1);
  });
});

describe('GET /api/eps/documents', () => {
  test('returns 401 anonymously', async () => {
    assert.equal((await documentsGET(makeRequest())).status, 401);
  });

  test('returns 403 without document permissions', async () => {
    currentUser = forbiddenUser;
    assert.equal((await documentsGET(makeRequest())).status, 403);
  });

  test('returns 200 with document statistics for an authorized user', async () => {
    currentUser = authorizedUser;
    const response = await documentsGET(makeRequest({ url: 'http://localhost/api/eps/documents' }));
    const body = (await response.json()) as { success: boolean; data: { total: number } };
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.total, 0);
  });
});

describe('POST /api/eps/documents', () => {
  test('returns 401 anonymously', async () => {
    assert.equal((await documentsPOST(makeRequest({ method: 'POST', formData: new FormData() }))).status, 401);
  });

  test('returns 403 without upload permission', async () => {
    currentUser = forbiddenUser;
    assert.equal((await documentsPOST(makeRequest({ method: 'POST', formData: new FormData() }))).status, 403);
  });

  test('returns 400 when no file is attached', async () => {
    currentUser = authorizedUser;
    const formData = new FormData();
    formData.set('equipmentId', 'equipment-1');
    const response = await documentsPOST(makeRequest({ method: 'POST', formData }));
    assert.equal(response.status, 400);
    assert.equal(storageCalls, 0);
  });

  test('stores a document for an authorized uploader', async () => {
    currentUser = authorizedUser;
    const formData = new FormData();
    formData.set('equipmentId', 'equipment-1');
    formData.set('docType', 'MANUAL');
    formData.set('file', new File(['manual'], 'manual.pdf', { type: 'application/pdf' }));

    const response = await documentsPOST(makeRequest({ method: 'POST', formData }));
    assert.equal(response.status, 200);
    assert.equal(storageCalls, 1);
    assert.equal(auditCalls, 1);
  });
});

describe('GET /api/srm/issues', () => {
  test('returns 401 anonymously', async () => {
    assert.equal((await issuesGET(makeRequest())).status, 401);
  });

  test('returns 403 without dashboard permission', async () => {
    currentUser = forbiddenUser;
    assert.equal((await issuesGET(makeRequest())).status, 403);
  });

  test('returns 200 with issue list for an authorized user', async () => {
    currentUser = authorizedUser;
    const response = await issuesGET(makeRequest({ url: 'http://localhost/api/srm/issues' }));
    const body = (await response.json()) as { success: boolean; data: unknown[] };
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data, []);
  });
});

describe('POST /api/srm/issues', () => {
  const validBody = { summary: 'Pump failure', priority: 'high' };

  test('returns 401 anonymously', async () => {
    assert.equal((await issuesPOST(makeRequest({ method: 'POST', body: validBody }))).status, 401);
  });

  test('returns 403 without request-create permission', async () => {
    currentUser = forbiddenUser;
    assert.equal((await issuesPOST(makeRequest({ method: 'POST', body: validBody }))).status, 403);
  });

  test('returns 400 when summary is missing', async () => {
    currentUser = authorizedUser;
    const response = await issuesPOST(makeRequest({ method: 'POST', body: {} }));
    assert.equal(response.status, 400);
    assert.equal(auditCalls, 0);
  });

  test('creates an internal issue for an authorized user', async () => {
    currentUser = authorizedUser;
    const response = await issuesPOST(makeRequest({ method: 'POST', body: validBody }));
    const body = (await response.json()) as { success: boolean; data: { issueKey: string } };
    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.issueKey, 'EMS-1');
    assert.equal(auditCalls, 1);
  });

  test('suite never opens a real database connection', () => {
    assert.equal(prismaMock._connectionAttempts(), 0);
  });
});
