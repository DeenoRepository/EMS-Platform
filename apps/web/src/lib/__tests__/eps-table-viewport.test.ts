import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('EPS Equipment Registry Table Viewport & Horizontal Scrollbar', () => {
  it('DataTableWrapper sets default viewport-constrained maxHeight, flex column and sticky pagination', () => {
    const wrapperSource = readProjectFile('apps/web/src/components/ui/DataTableWrapper.tsx');
    assert.match(wrapperSource, /display:\s*'flex'/);
    assert.match(wrapperSource, /flexDirection:\s*'column'/);
    assert.match(wrapperSource, /flex:\s*'1 1 auto'/);
    assert.match(wrapperSource, /overflowX:\s*'auto'/);
    assert.match(wrapperSource, /overflowY:\s*'auto'/);
    assert.match(wrapperSource, /'&::-webkit-scrollbar':\s*\{\s*height:\s*9/);
    assert.match(wrapperSource, /flexShrink:\s*0/);
    assert.match(wrapperSource, /position:\s*'sticky'/);
    assert.match(wrapperSource, /bottom:\s*0/);
  });

  it('EPS equipment registry page passes adaptive maxHeight, stickyHeader and server-side sort to API', () => {
    const pageSource = readProjectFile('apps/web/src/app/eps/page.tsx');
    assert.match(pageSource, /tableWrapperRef/);
    assert.match(pageSource, /tableMaxHeight/);
    assert.match(pageSource, /calculateTableHeight/);
    assert.match(pageSource, /window\.innerHeight/);
    assert.match(pageSource, /maxHeight=\{tableMaxHeight\}/);
    assert.match(pageSource, /stickyHeader/);
    assert.match(pageSource, /<Table\s+stickyHeader/);
    assert.match(pageSource, /minWidth:\s*1400/);
    assert.match(pageSource, /buildEquipmentFilterSearchParams\([\s\S]*sortField[\s\S]*sortDirection/);
  });
});
