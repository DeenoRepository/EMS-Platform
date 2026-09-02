/**
 * Executable tests covering /api/prm/requests/[id] (GET) and the status
 * transition action routes (submit, approve, reject, cancel).
 *
 * Contract under test for the transition routes:
 *   • anonymous request → 401
 *   • authenticated user without required permission → 403
 *   • invalid transition (e.g. approve a DRAFT) → 400
 *   • reject without resolutionComment → 400
 *   • valid transition by an authorized actor → 200, audit + notification
 *   • persistence failure → 500 without leaking internal error
 */
import { before, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { makeRequest } from './helpers/route-harness';

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

let currentUser: JwtUserPayload | null = null;
let existingRequest: any;
let updatedRequest: any;
let updateCallArgs: unknown = null;
let updateShouldThrow = false;
let detailUpdateShouldThrow = false;
let notificationCreates: unknown[] = [];
let auditEvents: unknown[] = [];

interface PrismaMock {
  $transaction: (callback: (tx: PrismaMock) => Promise<unknown>) => Promise<unknown>;
  purchaseRequest: {
    findUnique: () => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  purchaseRequestItem: {
    deleteMany: (args: unknown) => Promise<unknown>;
  };
  warehouse: {
    findUnique: (args: unknown) => Promise<unknown>;
  };
  notification: {
    create: (args: unknown) => Promise<unknown>;
  };
}

const prismaMock: PrismaMock = {
  $transaction: async (callback) => callback(prismaMock),
  purchaseRequest: {
    findUnique: async () => existingRequest,
    update: async (args: unknown) => {
      updateCallArgs = args;
      if (updateShouldThrow || detailUpdateShouldThrow) throw new Error('db failure');
      updatedRequest = {
        ...existingRequest,
        ...(args as any).data,
        requestNumber: existingRequest.requestNumber,
      };
      return updatedRequest;
    },
  },
  purchaseRequestItem: {
    deleteMany: async () => ({ count: 1 }),
  },
  warehouse: {
    findUnique: async () => ({ id: 'wh-1', name: 'Main', isActive: true }),
  },
  notification: {
    create: async (args: unknown) => {
      notificationCreates.push(args);
      return { id: 'notif-1' };
    },
  },
};

mock.module('@ems/database', {
  namedExports: { prisma: prismaMock, PurchaseRequestStatus },
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
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: JwtUserPayload | null, permission: string) =>
      Boolean(user && user.permissions.includes(permission)),
    logAuditEvent: async (event: unknown) => {
      auditEvents.push(event);
    },
  },
});
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    isAdminUser: (user: JwtUserPayload | null) => Boolean(user && user.roles.includes('admin')),
    unauthorizedResponse: () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    forbiddenResponse: (message = 'Forbidden') => Response.json({ success: false, error: message }, { status: 403 }),
  },
});

const requester: JwtUserPayload = {
  userId: 'requester-id',
  ldapLogin: 'requester',
  displayName: 'Requester',
  roles: ['engineer'],
  permissions: [PERMISSIONS.PRM_REQUESTS_VIEW, PERMISSIONS.PRM_REQUESTS_CREATE],
};

const otherUser: JwtUserPayload = {
  ...requester,
  userId: 'other-user-id',
};

const reviewer: JwtUserPayload = {
  userId: 'reviewer-id',
  ldapLogin: 'reviewer',
  displayName: 'Reviewer',
  roles: ['manager'],
  permissions: [PERMISSIONS.PRM_REQUESTS_VIEW, PERMISSIONS.PRM_REQUESTS_MANAGE],
};

interface RouteContext {
  params: Promise<{ id: string }>;
}
type Handler = (request: Request, context: RouteContext) => Promise<Response>;
const handlers: Record<string, Handler> = {};
let detailGET: Handler;
let detailPATCH: Handler;

before(async () => {
  const detail = await import('@/app/api/prm/requests/[id]/route');
  const submit = await import('@/app/api/prm/requests/[id]/submit/route');
  const approve = await import('@/app/api/prm/requests/[id]/approve/route');
  const reject = await import('@/app/api/prm/requests/[id]/reject/route');
  const cancel = await import('@/app/api/prm/requests/[id]/cancel/route');
  detailGET = detail.GET as unknown as Handler;
  detailPATCH = detail.PATCH as unknown as Handler;
  handlers.submit = submit.POST as unknown as Handler;
  handlers.approve = approve.POST as unknown as Handler;
  handlers.reject = reject.POST as unknown as Handler;
  handlers.cancel = cancel.POST as unknown as Handler;
});

function resetState(status: string = PurchaseRequestStatus.DRAFT) {
  currentUser = null;
  existingRequest = {
    id: 'req-1',
    requestNumber: 'PR-20260902-ABCDEF',
    status,
    requesterId: 'requester-id',
    targetWarehouseId: 'wh-1',
    targetWarehouse: { id: 'wh-1', name: 'Main', code: 'MAIN', responsibleUserId: 'wh-owner-id' },
  };
  updatedRequest = null;
  updateCallArgs = null;
  updateShouldThrow = false;
  detailUpdateShouldThrow = false;
  notificationCreates = [];
  auditEvents = [];
}

function context(id = 'req-1'): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function post(body?: unknown) {
  return makeRequest({ method: 'POST', body, url: 'http://localhost:3000/api/prm/test' });
}

function patch(body?: unknown) {
  return makeRequest({ method: 'PATCH', body, url: 'http://localhost:3000/api/prm/test' });
}

describe('GET /api/prm/requests/[id]', () => {
  test('returns 401 for anonymous requests', async () => {
    resetState();
    const res = await detailGET(makeRequest({ url: 'http://localhost/api/prm/requests/req-1' }), context());
    assert.equal(res.status, 401);
  });

  test('returns 403 for a user unrelated to the request or its warehouse', async () => {
    resetState();
    currentUser = otherUser;
    existingRequest.targetWarehouse.responsibleUserId = 'someone-else';
    const res = await detailGET(makeRequest({ url: 'http://localhost/api/prm/requests/req-1' }), context());
    assert.equal(res.status, 403);
  });

  test('returns 200 for the requester', async () => {
    resetState();
    currentUser = requester;
    const res = await detailGET(makeRequest({ url: 'http://localhost/api/prm/requests/req-1' }), context());
    assert.equal(res.status, 200);
  });
});

describe('PATCH /api/prm/requests/[id]', () => {
  test('returns 401 for anonymous requests', async () => {
    resetState();
    const res = await detailPATCH(patch({ items: [{ nomenclatureId: 'nom-1', requestedQty: 1, estimatedPrice: 10 }] }), context());
    assert.equal(res.status, 401);
  });

  test('returns 403 when a non-requester attempts to edit a draft', async () => {
    resetState();
    currentUser = otherUser;
    const res = await detailPATCH(patch({ priority: 'HIGH' }), context());
    assert.equal(res.status, 403);
  });

  test('returns 400 when editing a non-draft request', async () => {
    resetState(PurchaseRequestStatus.SUBMITTED);
    currentUser = requester;
    const res = await detailPATCH(patch({ priority: 'HIGH' }), context());
    assert.equal(res.status, 400);
  });

  test('returns 400 for an empty replacement item list', async () => {
    resetState();
    currentUser = requester;
    const res = await detailPATCH(patch({ items: [] }), context());
    assert.equal(res.status, 400);
  });

  test('updates draft fields and replaces items transactionally', async () => {
    resetState();
    currentUser = requester;
    const res = await detailPATCH(patch({
      priority: 'HIGH',
      justification: '  Updated need  ',
      items: [{ nomenclatureId: 'nom-1', requestedQty: 3, estimatedPrice: 20 }],
    }), context());
    assert.equal(res.status, 200);
    assert.equal((updateCallArgs as any).data.priority, 'HIGH');
    assert.equal((updateCallArgs as any).data.justification, 'Updated need');
    assert.equal((updateCallArgs as any).data.estimatedTotal, 60);
    assert.equal(auditEvents.length, 1);
  });

  test('returns 500 without leaking persistence details', async () => {
    resetState();
    currentUser = requester;
    detailUpdateShouldThrow = true;
    const res = await detailPATCH(patch({ priority: 'HIGH' }), context());
    assert.equal(res.status, 500);
    const body = (await res.json()) as { error: string };
    assert.doesNotMatch(body.error, /db failure/);
  });
});

describe('POST /api/prm/requests/[id]/submit', () => {
  test('returns 401 for anonymous requests', async () => {
    resetState();
    const res = await handlers.submit(post(), context());
    assert.equal(res.status, 401);
  });

  test('returns 403 without PRM_REQUESTS_CREATE', async () => {
    resetState();
    currentUser = reviewer; // has MANAGE but not CREATE
    const res = await handlers.submit(post(), context());
    assert.equal(res.status, 403);
  });

  test('rejects submitting an already-submitted request (invalid transition)', async () => {
    resetState(PurchaseRequestStatus.SUBMITTED);
    currentUser = requester;
    const res = await handlers.submit(post(), context());
    assert.equal(res.status, 400);
  });

  test('rejects submit by a user who is not the requester', async () => {
    resetState(PurchaseRequestStatus.DRAFT);
    currentUser = otherUser;
    const res = await handlers.submit(post(), context());
    assert.equal(res.status, 403);
  });

  test('submits DRAFT -> SUBMITTED, audits, and notifies warehouse owner', async () => {
    resetState(PurchaseRequestStatus.DRAFT);
    currentUser = requester;
    const res = await handlers.submit(post(), context());
    assert.equal(res.status, 200);
    assert.equal((updateCallArgs as any).data.status, PurchaseRequestStatus.SUBMITTED);
    assert.equal(auditEvents.length, 1);
    assert.equal(notificationCreates.length, 1);
  });
});

describe('POST /api/prm/requests/[id]/approve', () => {
  test('returns 403 without PRM_REQUESTS_MANAGE', async () => {
    resetState(PurchaseRequestStatus.SUBMITTED);
    currentUser = requester;
    const res = await handlers.approve(post(), context());
    assert.equal(res.status, 403);
  });

  test('rejects approving a DRAFT request (must be SUBMITTED first)', async () => {
    resetState(PurchaseRequestStatus.DRAFT);
    currentUser = reviewer;
    const res = await handlers.approve(post(), context());
    assert.equal(res.status, 400);
  });

  test('approves SUBMITTED -> APPROVED and records reviewer', async () => {
    resetState(PurchaseRequestStatus.SUBMITTED);
    currentUser = reviewer;
    const res = await handlers.approve(post({ resolutionComment: 'OK' }), context());
    assert.equal(res.status, 200);
    assert.equal((updateCallArgs as any).data.status, PurchaseRequestStatus.APPROVED);
    assert.deepEqual((updateCallArgs as any).data.reviewer, { connect: { id: 'reviewer-id' } });
    assert.equal(notificationCreates.length, 1);
  });

  test('returns 500 without leaking internal error when persistence fails', async () => {
    resetState(PurchaseRequestStatus.SUBMITTED);
    currentUser = reviewer;
    updateShouldThrow = true;
    const res = await handlers.approve(post(), context());
    assert.equal(res.status, 500);
    const body = (await res.json()) as { error: string };
    assert.doesNotMatch(body.error, /db failure/);
  });
});

describe('POST /api/prm/requests/[id]/reject', () => {
  test('requires a resolutionComment', async () => {
    resetState(PurchaseRequestStatus.SUBMITTED);
    currentUser = reviewer;
    const res = await handlers.reject(post({}), context());
    assert.equal(res.status, 400);
  });

  test('rejects SUBMITTED -> REJECTED with comment', async () => {
    resetState(PurchaseRequestStatus.SUBMITTED);
    currentUser = reviewer;
    const res = await handlers.reject(post({ resolutionComment: 'Missing justification' }), context());
    assert.equal(res.status, 200);
    assert.equal((updateCallArgs as any).data.status, PurchaseRequestStatus.REJECTED);
    assert.equal((updateCallArgs as any).data.resolutionComment, 'Missing justification');
  });
});

describe('POST /api/prm/requests/[id]/cancel', () => {
  test('allows the requester to cancel their own DRAFT', async () => {
    resetState(PurchaseRequestStatus.DRAFT);
    currentUser = requester;
    const res = await handlers.cancel(post(), context());
    assert.equal(res.status, 200);
    assert.equal((updateCallArgs as any).data.status, PurchaseRequestStatus.CANCELLED);
  });

  test('forbids a bystander from cancelling someone else\'s request', async () => {
    resetState(PurchaseRequestStatus.DRAFT);
    currentUser = otherUser;
    const res = await handlers.cancel(post(), context());
    assert.equal(res.status, 403);
  });

  test('rejects cancelling an already-terminal request', async () => {
    resetState(PurchaseRequestStatus.APPROVED);
    currentUser = requester;
    const res = await handlers.cancel(post(), context());
    assert.equal(res.status, 400);
  });
});
