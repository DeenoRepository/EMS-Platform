import { test, describe } from 'node:test';
import assert from 'node:assert';
import { signSessionToken, verifySessionToken } from './jwt';
import { JwtUserPayload } from '@ems/shared';

describe('JWT Session Management', () => {
  const samplePayload: JwtUserPayload = {
    userId: 'test-user-123',
    ldapLogin: 'ivanov',
    displayName: 'Иван Иванов',
    email: 'ivanov@company.local',
    roles: ['admin'],
    permissions: ['eps.equipment.view', 'eps.equipment.create'],
  };

  test('Signs and successfully verifies a session token', async () => {
    const token = await signSessionToken(samplePayload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const verified = await verifySessionToken(token);
    assert.ok(verified !== null);
    assert.strictEqual(verified.userId, samplePayload.userId);
    assert.strictEqual(verified.ldapLogin, samplePayload.ldapLogin);
    assert.deepStrictEqual(verified.roles, samplePayload.roles);
    assert.deepStrictEqual(verified.permissions, samplePayload.permissions);
  });

  test('Rejects invalid token', async () => {
    const invalidToken = 'invalid.jwt.token.string';
    const result = await verifySessionToken(invalidToken);
    assert.strictEqual(result, null);
  });

  test('Rejects empty or corrupted token', async () => {
    const result = await verifySessionToken('');
    assert.strictEqual(result, null);
  });
});
