import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getLoginErrorMessage, getLoginExceptionMessage, getLoginValidationError } from './login-flow';

describe('login flow helpers', () => {
  test('requires a non-empty username before checking offline state', () => {
    assert.match(getLoginValidationError('', false) ?? '', /логин/);
    assert.match(getLoginValidationError('   ', false) ?? '', /логин/);
  });

  test('reports offline database state only after username is present', () => {
    assert.match(getLoginValidationError('admin', true) ?? '', /PostgreSQL/);
    assert.equal(getLoginValidationError('admin', false), null);
  });

  test('prefers server error message and falls back to a generic message', () => {
    assert.equal(getLoginErrorMessage({ success: false, error: 'Учетная запись заблокирована' }), 'Учетная запись заблокирована');
    assert.equal(getLoginErrorMessage({ success: false }), 'Неверный логин или пароль');
  });

  test('extracts a message from Error instances and falls back otherwise', () => {
    assert.equal(getLoginExceptionMessage(new Error('network down')), 'network down');
    assert.equal(getLoginExceptionMessage(new Error('')), 'Ошибка при отправке запроса авторизации');
    assert.equal(getLoginExceptionMessage('plain string'), 'Ошибка при отправке запроса авторизации');
    assert.equal(getLoginExceptionMessage(null), 'Ошибка при отправке запроса авторизации');
  });
});
