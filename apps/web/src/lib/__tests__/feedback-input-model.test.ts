import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseFeedbackJsonInput,
  parseFeedbackMultipartInput,
} from '../../app/api/feedback/input-model';

test('parses JSON feedback input with defaults and optional values', () => {
  assert.deepEqual(parseFeedbackJsonInput({
    title: '  Broken button  ',
    description: '  It does not submit  ',
    pageUrl: '/feedback',
    browserInfo: { userAgent: 'test' },
  }), {
    title: '  Broken button  ',
    description: '  It does not submit  ',
    type: 'BUG',
    feedbackModule: 'GENERAL',
    priority: 'MEDIUM',
    pageUrl: '/feedback',
    browserInfo: { userAgent: 'test' },
    uploadedFiles: [],
  });
});

test('parses multipart fields, browser JSON, and non-empty files', () => {
  const file = new File(['content'], 'screen.png', { type: 'image/png' });
  const emptyFile = new File([], 'empty.png', { type: 'image/png' });
  const fields = new Map<string, FormDataEntryValue>([
    ['title', 'Title'],
    ['description', 'Description'],
    ['type', 'FEATURE_REQUEST'],
    ['module', 'WMS'],
    ['priority', 'HIGH'],
    ['pageUrl', '/wms'],
    ['browserInfo', '{"browser":"test"}'],
  ]);

  assert.deepEqual(parseFeedbackMultipartInput({
    get: (name) => fields.get(name) ?? null,
    getAll: (name) => name === 'files' ? [file, emptyFile] : [],
  }), {
    title: 'Title',
    description: 'Description',
    type: 'FEATURE_REQUEST',
    feedbackModule: 'WMS',
    priority: 'HIGH',
    pageUrl: '/wms',
    browserInfo: { browser: 'test' },
    uploadedFiles: [file],
  });
});

test('uses null for invalid multipart browser JSON and missing page URL', () => {
  assert.deepEqual(parseFeedbackMultipartInput({
    get: (name) => name === 'browserInfo' ? '{invalid' : null,
    getAll: () => [],
  }), {
    title: '',
    description: '',
    type: 'BUG',
    feedbackModule: 'GENERAL',
    priority: 'MEDIUM',
    pageUrl: null,
    browserInfo: null,
    uploadedFiles: [],
  });
});
