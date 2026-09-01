import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { adminUser, makePrismaMock, makeRequest } from './helpers/route-harness';

const prismaMock = makePrismaMock() as ReturnType<typeof makePrismaMock> & {
  photo: { findFirst: (args: unknown) => Promise<unknown> };
  feedbackAttachment: { findFirst: (args: unknown) => Promise<unknown> };
  userRole: { deleteMany: (args: unknown) => Promise<unknown>; createMany: (args: unknown) => Promise<unknown> };
};
prismaMock.photo = { findFirst: async () => null };
prismaMock.feedbackAttachment = { findFirst: async () => null };
prismaMock.userRole = { deleteMany: async () => ({ count: 0 }), createMany: async () => ({ count: 0 }) };

let currentUser: JwtUserPayload | null = null;
let installState = {
  isInstalled: true,
  isDefinitive: true,
  markerExists: true,
  hasAdmin: true,
};
let canReadFile = true;
let ldapResult: { success: boolean; message?: string; error?: string; user?: unknown } = {
  success: true,
  message: 'LDAP connection established',
};
let adapterResult: { success: boolean; message: string; diagnostics?: unknown } = {
  success: true,
  message: 'SRM connection established',
};
let adapterCalls: any[] = [];
let ldapCalls: any[] = [];
let loggedErrors: unknown[] = [];
let acceptedPermissions: string[] = [];
const testUploadDir = path.join('/tmp', 'ems-test-uploads');

const viewer: JwtUserPayload = {
  userId: 'viewer-id',
  ldapLogin: 'viewer',
  displayName: 'Viewer',
  roles: ['viewer'],
  permissions: [],
};

const admin: JwtUserPayload = {
  ...adminUser,
  permissions: Object.values(PERMISSIONS),
};

mock.module('@ems/database', {
  namedExports: { prisma: prismaMock, PrismaClient: class MockPrismaClient {
    static instances: MockPrismaClient[] = [];
    options: unknown;
    constructor(options: unknown) {
      this.options = options;
      MockPrismaClient.instances.push(this);
    }
    $queryRaw = async () => [{ connected: 1 }];
    $disconnect = async () => {};
  } },
});

mock.module('@ems/auth', {
  namedExports: {
    hasPermission: (user: JwtUserPayload | null, permission: string) =>
      Boolean(user && (user.roles.includes('admin') || user.roles.includes('administrator') || user.permissions.includes(permission))),
    testLdapConnection: async (options: unknown) => {
      ldapCalls.push(options);
      return ldapResult;
    },
    getSrmAdapter: (providerType: string) => ({
      testConnection: async (integration: unknown) => {
        adapterCalls.push({ providerType, integration });
        return adapterResult;
      },
    }),
  },
});

mock.module('@/lib/srm-providers', {
  namedExports: {
    getSrmAdapter: (providerType: string) => ({
      testConnection: async (integration: unknown) => {
        adapterCalls.push({ providerType, integration });
        return adapterResult;
      },
    }),
  },
});

mock.module('@/lib/rate-limit', {
  namedExports: { enforceRateLimit: async () => null },
});

mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => currentUser,
    isAdminUser: (user: JwtUserPayload) => user.roles.includes('admin') || user.roles.includes('administrator'),
    requireAuth: async () => {
      if (!currentUser) {
        return { errorResponse: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
      }
      const accepted = acceptedPermissions.length === 0 || acceptedPermissions.some((permission) => currentUser!.permissions.includes(permission));
      return accepted
        ? { user: currentUser }
        : { errorResponse: Response.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
    },
    unauthorizedResponse: () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    forbiddenResponse: () => Response.json({ success: false, error: 'Forbidden' }, { status: 403 }),
  },
});

mock.module('@/lib/safe-error', {
  namedExports: {
    safeErrorResponse: (_error: unknown, message: string) => Response.json({ success: false, error: message }, { status: 500 }),
    toSafeErrorDetails: (_error: unknown, publicError: string) => ({
      publicError,
      logMessage: 'private test details',
      correlationId: 'test-correlation-id',
    }),
  },
});

mock.module('@/lib/logger', {
  namedExports: {
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: (message: unknown) => { loggedErrors.push(message); },
    },
  },
});

mock.module('@/lib/install-state', {
  namedExports: {
    resolveInstallState: async () => installState,
  },
});

mock.module('@/lib/file-access', {
  namedExports: {
    normalizeStoredFilePath: (parts: string[]) => {
      if (parts.some((part) => part === '..' || part.includes('\\') || part.includes('\u0000'))) return null;
      return parts.join('/');
    },
    findStoredFileResource: async (filePath: string) =>
      filePath === 'documents/report.pdf' ? { kind: 'equipment-document', filePath } : null,
    canReadStoredFile: async () => canReadFile,
  },
});

mock.module('@/lib/storage', {
  namedExports: { getAbsoluteFilePath: (relativePath: string) => `/tmp/ems-test-uploads/${relativePath}` },
});

interface RouteContext {
  params: Promise<{ path: string[] }>;
}
type Handler = (request: Request, context?: RouteContext) => Promise<Response>;
const handlers: Record<string, Handler> = {};

before(async () => {
  process.env.UPLOAD_DIR = testUploadDir;
  fs.mkdirSync(path.join(testUploadDir, 'documents'), { recursive: true });
  fs.writeFileSync(path.join(testUploadDir, 'documents', 'report.pdf'), 'test-pdf-content');

  const files = await import('@/app/api/files/[...path]/route');
  const setupDb = await import('@/app/api/setup/test-db/route');
  const setupLdap = await import('@/app/api/setup/test-ldap/route');
  const adminLdap = await import('@/app/api/admin/settings/test-ldap/route');
  const adminSrm = await import('@/app/api/admin/settings/test-srm/route');
  const adminJira = await import('@/app/api/admin/settings/test-jira/route');
  const srmConnection = await import('@/app/api/srm/test-connection/route');
  const setupStatus = await import('@/app/api/setup/status/route');
  const setupExecute = await import('@/app/api/setup/execute/route');
  const health = await import('@/app/api/system/health/route');

  handlers.filesGET = files.GET as unknown as Handler;
  handlers.setupDbPOST = setupDb.POST as unknown as Handler;
  handlers.setupLdapPOST = setupLdap.POST as unknown as Handler;
  handlers.adminLdapPOST = adminLdap.POST as unknown as Handler;
  handlers.adminSrmPOST = adminSrm.POST as unknown as Handler;
  handlers.adminJiraPOST = adminJira.POST as unknown as Handler;
  handlers.srmConnectionPOST = srmConnection.POST as unknown as Handler;
  handlers.setupStatusGET = setupStatus.GET as unknown as Handler;
  handlers.setupExecutePOST = setupExecute.POST as unknown as Handler;
  handlers.healthGET = health.GET as unknown as Handler;
});

beforeEach(() => {
  currentUser = null;
  installState = { isInstalled: true, isDefinitive: true, markerExists: true, hasAdmin: true };
  canReadFile = true;
  ldapResult = { success: true, message: 'LDAP connection established' };
  adapterResult = { success: true, message: 'SRM connection established' };
  adapterCalls = [];
  ldapCalls = [];
  loggedErrors = [];
  acceptedPermissions = [];
});

function request(method: string, body?: unknown, searchParams?: Record<string, string>) {
  return makeRequest({ method, body, searchParams, url: 'http://localhost:3000/api/security-hardening-test' });
}

function fileContext(path: string[]): RouteContext {
  return { params: Promise.resolve({ path }) };
}

describe('security hardening route contracts', { concurrency: false }, () => {
  describe('GET /api/files/[...path]', () => {
    test('returns 401 without a session', async () => {
      const response = await handlers.filesGET(request('GET'), fileContext(['documents', 'report.pdf']));
      assert.equal(response.status, 401);
    });

    test('rejects traversal vectors before reading a file', async () => {
      currentUser = admin;
      const traversalVectors = [
        ['documents', '..', 'secret.txt'],
        ['..%2fsecret.txt'],
        ['/etc/passwd'],
        ['documents', 'link-to-secret'],
      ];

      for (const vector of traversalVectors) {
        const response = await handlers.filesGET(request('GET'), fileContext(vector));
        assert.equal(response.status, 403, vector.join('/'));
      }
    });

    test('streams an authorized stored file with safe response headers', async () => {
      currentUser = admin;
      const response = await handlers.filesGET(request('GET'), fileContext(['documents', 'report.pdf']));
      const content = Buffer.from(await response.arrayBuffer()).toString();

      assert.equal(response.status, 200);
      assert.equal(content, 'test-pdf-content');
      assert.equal(response.headers.get('content-type'), 'application/pdf');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.match(response.headers.get('content-disposition') ?? '', /inline/);
    });

    test('rejects an unknown resource with 403', async () => {
      currentUser = admin;
      const response = await handlers.filesGET(request('GET'), fileContext(['documents', 'missing.pdf']));
      assert.equal(response.status, 403);
    });

    test('rejects a resource when the policy denies the current user', async () => {
      currentUser = admin;
      canReadFile = false;
      const response = await handlers.filesGET(request('GET'), fileContext(['documents', 'report.pdf']));
      assert.equal(response.status, 403);
    });
  });

  describe('POST /api/setup/test-db', () => {
    test('blocks anonymous diagnostics after installation', async () => {
      const response = await handlers.setupDbPOST(request('POST', { host: 'db.example', database: 'ems', user: 'tester' }));
      assert.equal(response.status, 403);
    });

    test('rejects incomplete connection details for an administrator', async () => {
      currentUser = admin;
      const response = await handlers.setupDbPOST(request('POST', {}));
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /хост|базу данных|пользователя/i);
    });

    test('tests a constructed URL and masks the password in the response', async () => {
      currentUser = admin;
      const response = await handlers.setupDbPOST(request('POST', {
        host: 'db.example', port: 5432, database: 'ems', user: 'tester', password: 'secret-password', ssl: true,
      }));
      const body = await response.json() as { success: boolean; testedUrl: string };

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.testedUrl.includes('secret-password'), false);
      assert.match(body.testedUrl, /tester:\*\*\*\*@db\.example/);
    });
  });

  describe('POST /api/setup/test-ldap', () => {
    test('blocks anonymous LDAP diagnostics after installation', async () => {
      const response = await handlers.setupLdapPOST(request('POST', { url: 'ldap://198.51.100.1:389' }));
      assert.equal(response.status, 403);
      assert.equal(ldapCalls.length, 0);
    });

    test('rejects a missing URL for an administrator', async () => {
      currentUser = admin;
      const response = await handlers.setupLdapPOST(request('POST', {}));
      assert.equal(response.status, 400);
    });

    test('rejects an internal LDAP address before calling the client', async () => {
      currentUser = admin;
      const response = await handlers.setupLdapPOST(request('POST', { url: 'ldap://127.0.0.1:389' }));
      assert.equal(response.status, 400);
      assert.equal(ldapCalls.length, 0);
    });

    test('returns the LDAP result for a public address', async () => {
      currentUser = admin;
      const response = await handlers.setupLdapPOST(request('POST', {
        url: 'ldaps://198.51.100.1:636', searchBase: ' dc=example,dc=test ', testLogin: 'ignored',
      }));
      const body = await response.json() as { success: boolean; data?: unknown };

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(ldapCalls.length, 1);
      assert.equal(ldapCalls[0].url, 'ldaps://198.51.100.1:636');
    });
  });

  describe('POST /api/admin/settings/test-ldap', () => {
    test('returns 401 anonymously and 403 without admin settings permission', async () => {
      assert.equal((await handlers.adminLdapPOST(request('POST', { ldapUrl: 'ldap://198.51.100.1:389' }))).status, 401);
      currentUser = viewer;
      assert.equal((await handlers.adminLdapPOST(request('POST', { ldapUrl: 'ldap://198.51.100.1:389' }))).status, 403);
    });

    test('rejects an internal LDAP URL', async () => {
      currentUser = admin;
      const response = await handlers.adminLdapPOST(request('POST', { ldapUrl: 'ldap://169.254.169.254:389' }));
      assert.equal(response.status, 400);
      assert.equal(ldapCalls.length, 0);
    });

    test('returns a successful LDAP diagnostic without exposing credentials', async () => {
      currentUser = admin;
      const response = await handlers.adminLdapPOST(request('POST', {
        ldapUrl: 'ldap://198.51.100.1:389', searchBase: 'dc=example,dc=test',
      }));
      const body = await response.json() as { success: boolean; details: { url: string } };

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.details.url, 'ldap://198.51.100.1:389');
      assert.equal(JSON.stringify(body).includes('secret'), false);
    });
  });

  describe('POST /api/admin/settings/test-srm and test-jira', () => {
    test('return 401 anonymously and 403 for a non-admin', async () => {
      assert.equal((await handlers.adminSrmPOST(request('POST', { providerUrl: 'https://198.51.100.1' }))).status, 401);
      assert.equal((await handlers.adminJiraPOST(request('POST', { providerUrl: 'https://198.51.100.1' }))).status, 401);
      currentUser = viewer;
      assert.equal((await handlers.adminSrmPOST(request('POST', { providerUrl: 'https://198.51.100.1' }))).status, 403);
    });

    test('supports the explicitly disabled provider without an outbound call', async () => {
      currentUser = admin;
      const response = await handlers.adminSrmPOST(request('POST', { providerType: 'DISABLED' }));
      const body = await response.json() as { success: boolean; latencyMs: number };

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.latencyMs, 0);
      assert.equal(adapterCalls.length, 0);
    });

    test('rejects an internal provider URL before calling the adapter', async () => {
      currentUser = admin;
      const response = await handlers.adminSrmPOST(request('POST', {
        providerType: 'JIRA', providerUrl: 'https://localhost:8443', apiKey: 'secret-token',
      }));
      assert.equal(response.status, 400);
      assert.equal(adapterCalls.length, 0);
    });

    test('maps a Jira diagnostic to the JIRA adapter contract', async () => {
      currentUser = admin;
      const response = await handlers.adminJiraPOST(request('POST', {
        providerType: 'JIRA', providerUrl: 'https://198.51.100.1', authUser: 'jira@example.test',
        apiKey: 'secret-token', projectKey: 'EMS',
      }));
      const body = await response.json() as { success: boolean; details: { providerType: string } };

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.details.providerType, 'JIRA');
      assert.equal(adapterCalls.length, 1);
      assert.equal(adapterCalls[0].providerType, 'JIRA');
      assert.equal(adapterCalls[0].integration.authConfig.username, 'jira@example.test');
      assert.equal(adapterCalls[0].integration.authConfig.apiToken, 'secret-token');
    });
  });

  describe('POST /api/srm/test-connection', () => {
    test('returns 401 anonymously and 403 for a user without any accepted permission', async () => {
      acceptedPermissions = [PERMISSIONS.ADMIN_SETTINGS_MANAGE, PERMISSIONS.SRM_SYNC_TRIGGER, PERMISSIONS.SRM_DASHBOARD_VIEW];
      assert.equal((await handlers.srmConnectionPOST(request('POST', { baseUrl: 'https://198.51.100.1' }))).status, 401);
      currentUser = viewer;
      assert.equal((await handlers.srmConnectionPOST(request('POST', { baseUrl: 'https://198.51.100.1' }))).status, 403);
    });

    test('rejects a missing base URL after authentication', async () => {
      currentUser = admin;
      acceptedPermissions = [PERMISSIONS.ADMIN_SETTINGS_MANAGE, PERMISSIONS.SRM_SYNC_TRIGGER, PERMISSIONS.SRM_DASHBOARD_VIEW];
      const response = await handlers.srmConnectionPOST(request('POST', {}));
      assert.equal(response.status, 400);
    });

    test('rejects a private base URL before calling the adapter', async () => {
      currentUser = admin;
      acceptedPermissions = [PERMISSIONS.ADMIN_SETTINGS_MANAGE, PERMISSIONS.SRM_SYNC_TRIGGER, PERMISSIONS.SRM_DASHBOARD_VIEW];
      const response = await handlers.srmConnectionPOST(request('POST', { baseUrl: 'https://127.0.0.1:8080' }));
      assert.equal(response.status, 400);
      assert.equal(adapterCalls.length, 0);
    });

    test('returns a provider result for a public base URL', async () => {
      currentUser = admin;
      acceptedPermissions = [PERMISSIONS.ADMIN_SETTINGS_MANAGE, PERMISSIONS.SRM_SYNC_TRIGGER, PERMISSIONS.SRM_DASHBOARD_VIEW];
      const response = await handlers.srmConnectionPOST(request('POST', {
        providerType: 'REST_GENERIC', baseUrl: 'https://198.51.100.1', authConfig: { token: 'secret-token' },
      }));
      const body = await response.json() as { success: boolean; data: { success: boolean } };

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.success, true);
      assert.equal(adapterCalls.length, 1);
    });

    test('sanitizes adapter failures', async () => {
      currentUser = admin;
      acceptedPermissions = [PERMISSIONS.ADMIN_SETTINGS_MANAGE, PERMISSIONS.SRM_SYNC_TRIGGER, PERMISSIONS.SRM_DASHBOARD_VIEW];
      adapterResult = { success: false, message: 'remote failure' };
      const response = await handlers.srmConnectionPOST(request('POST', { baseUrl: 'https://198.51.100.1' }));
      const body = await response.json() as { success: boolean; data: { success: boolean } };

      assert.equal(response.status, 200);
      assert.equal(body.success, false);
      assert.equal(body.data.success, false);
    });
  });

  describe('GET /api/setup/status', () => {
    test('does not expose dependency diagnostics to a non-admin after installation', async () => {
      currentUser = viewer;
      const response = await handlers.setupStatusGET(request('GET'));
      const body = await response.json() as {
        success: boolean;
        data: { isInstalled: boolean; dependencies: { checks: unknown[] } };
      };

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.isInstalled, true);
      assert.deepEqual(body.data.dependencies.checks, []);
    });

    test('exposes dependency diagnostics to an administrator', async () => {
      currentUser = admin;
      const response = await handlers.setupStatusGET(request('GET'));
      const body = await response.json() as {
        success: boolean;
        data: { dependencies: { checks: Array<{ id: string }> } };
      };

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.ok(body.data.dependencies.checks.some((check) => check.id === 'node_runtime'));
    });
  });

  describe('POST /api/setup/execute', () => {
    test('blocks anonymous re-initialization before parsing the request body', async () => {
      const response = await handlers.setupExecutePOST(request('POST', { adminConfig: { login: 'attacker' } }));
      const body = await response.json() as { success: boolean; error: string };

      assert.equal(response.status, 403);
      assert.equal(body.success, false);
      assert.match(body.error, /установлена|заблокирована/i);
    });

    test('blocks re-initialization for a non-administrator', async () => {
      currentUser = viewer;
      const response = await handlers.setupExecutePOST(request('POST', {
        adminConfig: { login: 'operator', password: 'password' },
      }));

      assert.equal(response.status, 403);
      assert.match((await response.json()).error, /установлена|заблокирована/i);
    });

    test('allows an administrator to reach setup validation without mutating the database', async () => {
      currentUser = admin;
      const response = await handlers.setupExecutePOST(request('POST', { adminConfig: {} }));

      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /логин супер-администратора/i);
    });
  });

  describe('GET /api/system/health diagnostics authorization', () => {
    test('requires authentication for diagnostics', async () => {
      const response = await handlers.healthGET(request('GET', undefined, { diagnostics: 'true' }));
      assert.equal(response.status, 401);
    });

    test('requires an administrator or audit/settings permission for diagnostics', async () => {
      currentUser = viewer;
      const response = await handlers.healthGET(request('GET', undefined, { diagnostics: 'true' }));
      assert.equal(response.status, 403);
    });
  });
});
