import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

const state = {
  user: { userId: 'user-1', roles: ['engineer'], permissions: ['eps.equipment.view', 'eps.equipment.edit', 'eps.documents.upload'] },
  hasPermission: true,
  equipment: null as unknown,
  document: null as unknown,
  photo: null as unknown,
  documentCreateError: false,
  photoCreateError: false,
  calls: [] as unknown[],
};

mock.module('@ems/shared', {
  namedExports: {
    PERMISSIONS: {
      EPS_EQUIPMENT_VIEW: 'eps.equipment.view',
      EPS_EQUIPMENT_EDIT: 'eps.equipment.edit',
      EPS_DOCUMENTS_UPLOAD: 'eps.documents.upload',
    },
  },
});
mock.module('@/lib/auth-guard', {
  namedExports: {
    getCurrentUser: async () => state.user,
    unauthorizedResponse: () => new Response(null, { status: 401 }),
    forbiddenResponse: () => new Response(null, { status: 403 }),
  },
});
mock.module('@ems/auth', {
  namedExports: {
    hasPermission: () => state.hasPermission,
    logAuditEvent: async () => undefined,
  },
});
mock.module('@/lib/storage', {
  namedExports: {
    saveFile: async (_file: File, subFolder: string) => ({ fileName: 'saved.file', originalName: 'source.file', filePath: `${subFolder}/saved.file`, fileSize: 4, fileType: 'application/octet-stream' }),
    deleteFile: (filePath: string) => state.calls.push(['deleteFile', filePath]),
    getAbsoluteFilePath: (filePath: string) => path.resolve(process.cwd(), process.env.UPLOAD_DIR || process.env.STORAGE_LOCAL_DIR || './uploads', filePath),
  },
});
mock.module('@ems/database', {
  namedExports: {
    DocumentType: { OTHER: 'OTHER' },
    prisma: {
      equipment: {
        findFirst: async () => state.equipment,
      },
      document: {
        findFirst: async (args: unknown) => {
          state.calls.push(['document.findFirst', args]);
          return state.document;
        },
        create: async () => {
          if (state.documentCreateError) throw new Error('database failure');
          return { id: 'document-1' };
        },
        update: async (args: unknown) => state.calls.push(['document.update', args]),
      },
      photo: {
        findFirst: async (args: unknown) => {
          state.calls.push(['photo.findFirst', args]);
          return state.photo;
        },
        update: async (args: unknown) => state.calls.push(['photo.update', args]),
      },
      $transaction: async (callback: (tx: unknown) => unknown) => callback({
        photo: {
          updateMany: async () => undefined,
          create: async () => {
            if (state.photoCreateError) throw new Error('database failure');
            return { id: 'photo-1' };
          },
        },
      }),
    },
  },
});

function request(url: string, method: string, body?: BodyInit): Request {
  return new Request(url, { method, body });
}

describe('Stage 7 EPS route handlers', () => {
  beforeEach(() => {
    state.hasPermission = true;
    state.equipment = null;
    state.document = null;
    state.photo = null;
    state.documentCreateError = false;
    state.photoCreateError = false;
    state.calls.length = 0;
  });

  test('document and photo uploads reject soft-deleted equipment', async () => {
    const documents = await import('../../app/api/eps/equipment/[id]/documents/route');
    const photos = await import('../../app/api/eps/equipment/[id]/photos/route');
    const form = new FormData();
    form.set('file', new File(['data'], 'source.pdf', { type: 'application/pdf' }));

    const documentResponse = await documents.POST(request('http://localhost/api/eps/equipment/equipment-1/documents', 'POST', form) as never, { params: { id: 'equipment-1' } });
    const photoResponse = await photos.POST(request('http://localhost/api/eps/equipment/equipment-1/photos', 'POST', form) as never, { params: { id: 'equipment-1' } });

    assert.equal(documentResponse.status, 404);
    assert.equal(photoResponse.status, 404);
  });

  test('document and photo deletes scope the child ID to the route equipment', async () => {
    const documents = await import('../../app/api/eps/equipment/[id]/documents/route');
    const photos = await import('../../app/api/eps/equipment/[id]/photos/route');

    const documentResponse = await documents.DELETE(request('http://localhost/api/eps/equipment/equipment-1/documents?documentId=document-2', 'DELETE') as never, { params: { id: 'equipment-1' } });
    const photoResponse = await photos.DELETE(request('http://localhost/api/eps/equipment/equipment-1/photos?photoId=photo-2', 'DELETE') as never, { params: { id: 'equipment-1' } });

    assert.equal(documentResponse.status, 404);
    assert.equal(photoResponse.status, 404);
    assert.deepEqual(state.calls.map((call) => (call as unknown[])[0]), ['document.findFirst', 'photo.findFirst']);
    assert.equal(((state.calls[0] as unknown[])[1] as { where: { equipmentId: string } }).where.equipmentId, 'equipment-1');
    assert.equal(((state.calls[1] as unknown[])[1] as { where: { equipmentId: string } }).where.equipmentId, 'equipment-1');
  });

  test('download requires EPS permission before reading any file', async () => {
    state.hasPermission = false;
    const { GET } = await import('../../app/api/files/[...path]/route');
    const response = await GET(request('http://localhost/api/files/documents/saved.pdf', 'GET') as never, { params: { path: ['documents', 'saved.pdf'] } });
    assert.equal(response.status, 403);
    assert.deepEqual(state.calls, []);
  });

  test('download rejects paths without an active owned EPS record', async () => {
    state.hasPermission = true;
    const { GET } = await import('../../app/api/files/[...path]/route');
    const response = await GET(request('http://localhost/api/files/documents/missing.pdf', 'GET') as never, { params: { path: ['documents', 'missing.pdf'] } });
    assert.equal(response.status, 404);
    assert.deepEqual(state.calls.map((call) => (call as unknown[])[0]), ['document.findFirst', 'photo.findFirst']);
  });

  test('upload rolls back the saved file when document persistence fails', async () => {
    state.equipment = { id: 'equipment-1', deletedAt: null };
    state.documentCreateError = true;
    const { POST } = await import('../../app/api/eps/equipment/[id]/documents/route');
    const form = new FormData();
    form.set('file', new File(['data'], 'source.pdf', { type: 'application/pdf' }));

    const response = await POST(request('http://localhost/api/eps/equipment/equipment-1/documents', 'POST', form) as never, { params: { id: 'equipment-1' } });
    assert.equal(response.status, 500);
    assert.deepEqual(state.calls, [['deleteFile', 'documents/saved.file']]);
  });

  test('photo upload rolls back the saved file when persistence fails', async () => {
    state.equipment = { id: 'equipment-1', deletedAt: null };
    state.photoCreateError = true;
    const { POST } = await import('../../app/api/eps/equipment/[id]/photos/route');
    const form = new FormData();
    form.set('file', new File(['data'], 'source.jpg', { type: 'image/jpeg' }));

    const response = await POST(request('http://localhost/api/eps/equipment/equipment-1/photos', 'POST', form) as never, { params: { id: 'equipment-1' } });
    assert.equal(response.status, 500);
    assert.deepEqual(state.calls, [['deleteFile', 'photos/saved.file']]);
  });
});
