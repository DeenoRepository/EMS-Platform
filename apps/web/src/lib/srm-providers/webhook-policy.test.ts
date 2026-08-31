import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getSrmWebhookAuthPolicy, hasSecureSrmWebhookAuth } from './webhook-policy';

describe('getSrmWebhookAuthPolicy', () => {
  test('returns no secret and disallows unsigned when config is null or non-object', () => {
    assert.deepEqual(getSrmWebhookAuthPolicy(null), { secret: null, allowUnsigned: false });
    assert.deepEqual(getSrmWebhookAuthPolicy('token'), { secret: null, allowUnsigned: false });
  });

  test('finds the first configured secret key in priority order', () => {
    assert.deepEqual(getSrmWebhookAuthPolicy({ webhookSecret: '  abc  ' }), { secret: 'abc', allowUnsigned: false });
    assert.deepEqual(getSrmWebhookAuthPolicy({ apiToken: 'tok' }), { secret: 'tok', allowUnsigned: false });
  });

  test('ignores blank secret values and treats them as absent', () => {
    assert.deepEqual(getSrmWebhookAuthPolicy({ webhookSecret: '   ' }), { secret: null, allowUnsigned: false });
  });

  test('reports allowUnsigned only when explicitly true', () => {
    assert.deepEqual(getSrmWebhookAuthPolicy({ allowUnsignedWebhooks: true }), { secret: null, allowUnsigned: true });
    assert.deepEqual(getSrmWebhookAuthPolicy({ allowUnsignedWebhooks: 'true' }), { secret: null, allowUnsigned: false });
  });
});

describe('hasSecureSrmWebhookAuth', () => {
  test('is secure when a secret is configured', () => {
    assert.equal(hasSecureSrmWebhookAuth({ token: 'abc' }), true);
  });

  test('is secure when unsigned webhooks are explicitly allowed', () => {
    assert.equal(hasSecureSrmWebhookAuth({ allowUnsignedWebhooks: true }), true);
  });

  test('is insecure fail-closed when neither a secret nor an explicit opt-in is present', () => {
    assert.equal(hasSecureSrmWebhookAuth({}), false);
    assert.equal(hasSecureSrmWebhookAuth(null), false);
  });
});
