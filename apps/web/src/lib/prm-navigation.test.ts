import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildPrmRequestDeepLink } from './prm-navigation';

describe('PRM notification navigation', () => {
  test('builds the canonical encoded registry deep link', () => {
    assert.equal(buildPrmRequestDeepLink('request/42?x=1'), '/prm?requestId=request%2F42%3Fx%3D1');
  });

  test('trims the request ID before encoding it', () => {
    assert.equal(buildPrmRequestDeepLink('  req-1  '), '/prm?requestId=req-1');
  });

  test('rejects an empty request ID', () => {
    assert.throws(() => buildPrmRequestDeepLink('   '), /request ID is required/);
  });
});
