import { before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';

const TEST_SECRET = 'middleware_test_secret_at_least_32_chars';
let setupInstalled = true;
let middleware: (request: unknown) => Promise<Response>;
let invalidateSetupCache: () => void;

before(async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  global.fetch = (async () =>
    Response.json({ data: { isInstalled: setupInstalled } })) as typeof fetch;
  const middlewareModule = await import('./middleware');
  middleware = middlewareModule.middleware as typeof middleware;
  invalidateSetupCache = middlewareModule.invalidateSetupCache;
});

beforeEach(() => {
  setupInstalled = true;
  invalidateSetupCache();
});

async function signedToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_SECRET));
}

function request(pathname: string, token?: string) {
  const url = new URL(`http://localhost${pathname}`);
  return {
    url: url.toString(),
    nextUrl: { pathname },
    cookies: { get: (name: string) => (name === 'ems_token' && token ? { value: token } : undefined) },
  };
}

describe('middleware authorization routing', () => {
  test('allows public health and static paths without setup/auth checks', async () => {
    assert.equal((await middleware(request('/api/system/health'))).status, 200);
  });

  test('redirects unconfigured installations to setup', async () => {
    setupInstalled = false;
    const response = await middleware(request('/eps'));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'http://localhost/setup');
  });

  test('returns 401 for anonymous protected API requests', async () => {
    const response = await middleware(request('/api/eps/equipment'));
    assert.equal(response.status, 401);
  });

  test('allows an authenticated user on protected non-admin paths', async () => {
    const token = await signedToken({ userId: 'u1', roles: ['viewer'], permissions: [] });
    assert.equal((await middleware(request('/eps', token))).status, 200);
  });

  test('redirects non-admin users away from admin pages', async () => {
    const token = await signedToken({ userId: 'u1', roles: ['viewer'], permissions: [] });
    const response = await middleware(request('/admin/users', token));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'http://localhost/eps');
  });
});
