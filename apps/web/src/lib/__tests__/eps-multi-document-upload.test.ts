import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS multi-document upload support', () => {
  test('POST /api/eps/documents supports multiple file uploads via files and file', () => {
    const source = readProjectFile('apps/web/src/app/api/eps/documents/route.ts');
    assert.match(source, /formData\.getAll\('files'\)/);
    assert.match(source, /formData\.getAll\('file'\)/);
    assert.match(source, /ALLOWED_EXTENSIONS\.documents/);
    assert.match(source, /for\s*\(\s*const file of files\s*\)/);
    assert.match(source, /count:\s*createdDocuments\.length/);
    assert.match(source, /items:\s*createdDocuments/);
  });

  test('POST /api/eps/equipment/[id]/documents supports multiple file uploads', () => {
    const source = readProjectFile('apps/web/src/app/api/eps/equipment/[id]/documents/route.ts');
    assert.match(source, /formData\.getAll\('files'\)/);
    assert.match(source, /formData\.getAll\('file'\)/);
    assert.match(source, /ALLOWED_EXTENSIONS\.documents/);
    assert.match(source, /for\s*\(\s*const file of files\s*\)/);
    assert.match(source, /count:\s*createdDocuments\.length/);
  });

  test('EPS equipment card documents tab uses multiple file dropzone and batch upload', () => {
    const pageSource = readProjectFile('apps/web/src/app/eps/\[id\]/page.tsx');
    assert.match(pageSource, /selectedFiles,\s*setSelectedFiles/);
    assert.match(pageSource, /formData\.append\('file',\s*file\)/);

    const dialogSource = readProjectFile('apps/web/src/components/eps/passport/PassportUploadDocDialog.tsx');
    assert.match(dialogSource, /<FileUploadDropzone[\s\S]*multiple/);
    assert.match(dialogSource, /files=\{selectedFiles\}/);
    assert.match(dialogSource, /Прикрепить документы/);
  });
});
