import { before, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';

let apiResponses: Response[] = [];
let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
let customSectionRows: any[] = [];
let equipmentRows: any[] = [];
let sectionUpserts: any[] = [];
let fieldUpserts: any[] = [];
let fieldDeletes: any[] = [];
let equipmentUpdates: any[] = [];
let logs: Array<{ method: string; args: unknown[] }> = [];
let customSectionFindManyCalls = 0;

const prismaMock = {
  customSection: {
    findMany: async () => {
      customSectionFindManyCalls += 1;
      if (customSectionRows.length > 0 || customSectionFindManyCalls === 1) return customSectionRows;
      return sectionUpserts.map((entry: any, index) => ({ id: `section-${index + 1}`, ...entry.create }));
    },
    upsert: async (args: unknown) => {
      sectionUpserts.push(args);
      return { id: `section-${sectionUpserts.length}`, ...(args as any).create };
    },
  },
  customFieldDefinition: {
    deleteMany: async (args: unknown) => {
      fieldDeletes.push(args);
      return { count: 1 };
    },
    upsert: async (args: unknown) => {
      fieldUpserts.push(args);
      return { id: `field-${fieldUpserts.length}` };
    },
  },
  equipment: {
    findMany: async () => equipmentRows,
    update: async (args: unknown) => {
      equipmentUpdates.push(args);
      return { id: (args as any).where.id };
    },
  },
};

mock.module('@ems/database', { namedExports: { prisma: prismaMock } });
let fetchApi: typeof import('../api-client')['fetchApi'];
let fetchApiForm: typeof import('../api-client')['fetchApiForm'];
let requestLogger: typeof import('../logger')['requestLogger'];
let bootstrapStandardCustomSections: typeof import('../custom-sections-defaults')['bootstrapStandardCustomSections'];
let migrateEquipmentCustomFields: typeof import('../custom-sections-defaults')['migrateEquipmentCustomFields'];
let standardSections: typeof import('../custom-sections-defaults')['STANDARD_SECTIONS'];
let canonicalSpecs: typeof import('../custom-sections-defaults')['CANONICAL_SPECS'];

before(async () => {
  ({ fetchApi, fetchApiForm } = await import('../api-client'));
  ({ requestLogger } = await import('../logger'));
  ({ bootstrapStandardCustomSections, migrateEquipmentCustomFields, STANDARD_SECTIONS: standardSections, CANONICAL_SPECS: canonicalSpecs } = await import('../custom-sections-defaults'));
});

beforeEach(() => {
  apiResponses = [];
  fetchCalls = [];
  customSectionRows = [];
  equipmentRows = [];
  sectionUpserts = [];
  fieldUpserts = [];
  fieldDeletes = [];
  equipmentUpdates = [];
  logs = [];
  customSectionFindManyCalls = 0;
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return apiResponses.shift() ?? new Response('{}', { status: 200 });
  };
});

describe('API client contracts', () => {
  test('adds JSON headers, preserves successful typed payload, and forwards options', async () => {
    apiResponses.push(new Response(JSON.stringify({ success: true, data: { id: 'item-1' } }), { status: 200 }));

    const result = await fetchApi<{ id: string }>('/api/items', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    assert.deepEqual(result, { success: true, data: { id: 'item-1' } });
    assert.equal(fetchCalls[0].init?.method, 'PATCH');
    assert.equal(new Headers(fetchCalls[0].init?.headers).get('Content-Type'), 'application/json');
    assert.equal(new Headers(fetchCalls[0].init?.headers).get('Authorization'), 'Bearer test-token');
  });

  test('maps API errors, fallback HTTP errors, malformed JSON, and network failures', async () => {
    apiResponses.push(new Response(JSON.stringify({ error: 'Validation failed' }), { status: 400 }));
    assert.deepEqual(await fetchApi('/api/items'), { success: false, error: 'Validation failed' });

    apiResponses.push(new Response(JSON.stringify({}), { status: 503 }));
    assert.deepEqual(await fetchApi('/api/items'), { success: false, error: 'HTTP Error 503' });

    apiResponses.push(new Response('not-json', { status: 200 }));
    const malformed = await fetchApi('/api/items');
    assert.equal(malformed.success, false);

    globalThis.fetch = async () => { throw new Error('network unavailable'); };
    assert.deepEqual(await fetchApi('/api/items'), { success: false, error: 'network unavailable' });
  });

  test('submits FormData without forcing a JSON content type and maps form errors', async () => {
    const formData = new FormData();
    formData.set('file', new Blob(['content']), 'file.txt');
    apiResponses.push(new Response(JSON.stringify({ success: true, data: { id: 'file-1' } }), { status: 201 }));

    const success = await fetchApiForm<{ id: string }>('/api/upload', formData);
    assert.deepEqual(success, { success: true, data: { id: 'file-1' } });
    assert.equal(fetchCalls[0].init?.method, 'POST');
    assert.equal(fetchCalls[0].init?.body, formData);
    assert.equal(new Headers(fetchCalls[0].init?.headers).get('Content-Type'), null);

    apiResponses.push(new Response(JSON.stringify({ error: 'File rejected' }), { status: 400 }));
    assert.deepEqual(await fetchApiForm('/api/upload', formData), { success: false, error: 'File rejected' });
  });
});

describe('request logger contracts', () => {
  test('binds requestId to every log entry and preserves metadata', () => {
    // eslint-disable-next-line no-console
    const originalLog = console.log;
    // eslint-disable-next-line no-console
    const originalWarn = console.warn;
    // eslint-disable-next-line no-console
    const originalError = console.error;
    // eslint-disable-next-line no-console
    console.log = (...args: unknown[]) => logs.push({ method: 'info', args });
    // eslint-disable-next-line no-console
    console.warn = (...args: unknown[]) => logs.push({ method: 'warn', args });
    // eslint-disable-next-line no-console
    console.error = (...args: unknown[]) => logs.push({ method: 'error', args });

    try {
      const child = requestLogger('request-42');
      child.info('request received', { method: 'GET' });
      child.warn('slow request');
      child.error('request failed', { code: 'E_TEST' });
    } finally {
      // eslint-disable-next-line no-console
      console.log = originalLog;
      // eslint-disable-next-line no-console
      console.warn = originalWarn;
      // eslint-disable-next-line no-console
      console.error = originalError;
    }

    assert.equal(logs.length, 3);
    assert.match(String(logs[0].args[0]), /request-42/);
    assert.match(String(logs[0].args[0]), /request received/);
    assert.match(String(logs[0].args[0]), /GET/);
    assert.match(String(logs[2].args[0]), /E_TEST/);
  });
});

describe('standard custom section bootstrap', () => {
  test('creates standard sections and canonical fields on a clean dictionary', async () => {
    await bootstrapStandardCustomSections();

    assert.equal(sectionUpserts.length, standardSections.length);
    assert.equal(fieldDeletes.length, 2);
    assert.equal(fieldUpserts.length, canonicalSpecs.length);
    assert.deepEqual(sectionUpserts[0].where, { code: standardSections[0].code });
    assert.equal(fieldUpserts[0].create.fieldType, canonicalSpecs[0].fieldType);
  });

  test('does not recreate standard sections when they already exist but still repairs fields', async () => {
    customSectionRows = standardSections.map((section, index) => ({ ...section, id: `section-${index}` }));

    await bootstrapStandardCustomSections();

    assert.equal(sectionUpserts.length, 0);
    assert.equal(fieldDeletes.length, 2);
    assert.equal(fieldUpserts.length, canonicalSpecs.length);
  });
});

describe('equipment custom field migration', () => {
  test('moves duplicate values into model fields, canonicalizes keys, and removes duplicates', async () => {
    equipmentRows = [{
      id: 'equipment-1',
      serialNumber: null,
      location: null,
      customFields: {
        zavodskoy_nomer: 'SN-1',
        raspolozhenie: 'Shop 1',
        kod_okof_2: 'OKOF-1',
        okof_code: undefined,
        untouched: 'keep',
      },
    }];

    await migrateEquipmentCustomFields();

    assert.equal(equipmentUpdates.length, 1);
    const update = equipmentUpdates[0].data;
    assert.equal(update.serialNumber, 'SN-1');
    assert.equal(update.location, 'Shop 1');
    assert.equal(update.customFields.okof_code, 'OKOF-1');
    assert.equal(update.customFields.kod_okof_2, undefined);
    assert.equal(update.customFields.zavodskoy_nomer, undefined);
    assert.equal(update.customFields.untouched, 'keep');
  });

  test('does not update equipment when there are no duplicate keys or model changes', async () => {
    equipmentRows = [{
      id: 'equipment-1', serialNumber: 'SN-1', location: 'Shop 1', customFields: { untouched: 'keep' },
    }];

    await migrateEquipmentCustomFields();
    assert.equal(equipmentUpdates.length, 0);
  });
});
