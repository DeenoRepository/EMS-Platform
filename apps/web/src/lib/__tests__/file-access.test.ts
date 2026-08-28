import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { canReadFeedbackAttachment, normalizeStoredFilePath } from '../file-access';
import type { JwtUserPayload } from '@ems/shared';

const viewer: JwtUserPayload = {
  userId: 'viewer-1',
  ldapLogin: 'viewer',
  displayName: 'Viewer',
  roles: ['engineer'],
  permissions: ['eps.documents.view'],
};

const ticketCreator: JwtUserPayload = {
  ...viewer,
  userId: 'creator-1',
};

const admin: JwtUserPayload = {
  ...viewer,
  userId: 'admin-1',
  roles: ['admin'],
  permissions: [],
};

describe('file access policy', () => {
  test('normalizes safe stored paths and rejects traversal', () => {
    assert.equal(normalizeStoredFilePath(['documents', 'file.pdf']), 'documents/file.pdf');
    assert.equal(normalizeStoredFilePath(['documents', '..', 'secret.txt']), null);
    assert.equal(normalizeStoredFilePath(['..', 'secret.txt']), null);
    assert.equal(normalizeStoredFilePath([]), null);
  });

  test('allows only the ticket creator or feedback administrator', () => {
    assert.equal(canReadFeedbackAttachment(ticketCreator, 'creator-1'), true);
    assert.equal(canReadFeedbackAttachment(viewer, 'creator-1'), false);
    assert.equal(canReadFeedbackAttachment(admin, 'creator-1'), true);
  });
});
