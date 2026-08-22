import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword } from './password';

describe('Password hashing and verification', () => {
  test('hashPassword produces a non-empty string different from input', () => {
    const hash = hashPassword('MyS3cretP@ssword!');
    assert.ok(typeof hash === 'string' && hash.length > 20);
    assert.notStrictEqual(hash, 'MyS3cretP@ssword!');
  });

  test('verifyPassword returns true for a correct password', () => {
    const password = 'CorrectP@ssw0rd#2026';
    const hash = hashPassword(password);
    assert.strictEqual(verifyPassword(password, hash), true);
  });

  test('verifyPassword returns false for an incorrect password', () => {
    const hash = hashPassword('original_password');
    assert.strictEqual(verifyPassword('wrong_password', hash), false);
  });

  test('two hashes of the same password are different (random salt)', () => {
    const password = 'SamePw123!';
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    assert.notStrictEqual(hash1, hash2);
    // But both should verify correctly
    assert.strictEqual(verifyPassword(password, hash1), true);
    assert.strictEqual(verifyPassword(password, hash2), true);
  });

  test('verifyPassword returns false for empty hash', () => {
    assert.strictEqual(verifyPassword('any_password', ''), false);
  });

  test('verifyPassword returns false for malformed hash', () => {
    assert.strictEqual(verifyPassword('password', 'not-a-valid-hash-format'), false);
    assert.strictEqual(verifyPassword('password', 'pbkdf2$abc$def'), false);
  });

  test('verifyPassword is timing-safe (does not throw on different-length hashes)', () => {
    const hash = hashPassword('password123');
    // Should not throw, should return false
    assert.doesNotThrow(() => verifyPassword('wrong', hash));
    assert.strictEqual(verifyPassword('wrong', hash), false);
  });

  test('pbkdf2 format hash is correctly parsed', () => {
    // Verify the hash format is pbkdf2$iterations$salt$hash
    const hash = hashPassword('testpassword');
    assert.ok(hash.startsWith('pbkdf2$'), `Expected pbkdf2$ prefix, got: ${hash.slice(0, 20)}`);
    const parts = hash.split('$');
    assert.strictEqual(parts.length, 4);
    const iterations = parseInt(parts[1], 10);
    assert.ok(iterations >= 100_000, `Expected >= 100k iterations, got ${iterations}`);
  });
});
