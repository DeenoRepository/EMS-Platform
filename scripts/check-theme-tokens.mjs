#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = process.argv[2] || 'apps/web/src';
const HEX_MATCH = /#[0-9a-fA-F]{3,8}/g;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ALLOWED_PATH_SEGMENTS = ['/theme/'];

// Тесты не рендерят production-UI: hex в них — это фикстуры доменных данных
// (например, поле `color` метки классификации, приходящее из БД), а не стиль в
// `sx={}`, который запрещает .agents/rules/ui_design_code.md §2.
//
// Каталог `__tests__/` исключался и раньше, но тесты по конвенции проекта
// (см. scripts/README.md, «Test file co-location convention») могут лежать и
// рядом с модулем как `*.test.ts(x)`. Без этой проверки гейт зависел от того,
// какое из двух разрешённых расположений выбрал автор теста.
const TEST_FILE_PATTERN = /\.test\.(ts|tsx|js|jsx)$/;

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '__tests__'].includes(entry.name)) {
        scanDirectory(fullPath, fileList);
      }
      continue;
    }

    if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

const files = scanDirectory(path.resolve(process.cwd(), TARGET_DIR));
const violations = [];

for (const filePath of files) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (ALLOWED_PATH_SEGMENTS.some((segment) => normalizedPath.includes(segment))) continue;
  if (TEST_FILE_PATTERN.test(normalizedPath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const matches = line.match(HEX_MATCH);
    if (!matches) return;

    violations.push({
      filePath,
      line: index + 1,
      colors: matches,
    });
  });
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.warn(
      `[UI Design Code] ${path.relative(process.cwd(), violation.filePath)}:${violation.line} - Hardcoded hex color: ${violation.colors.join(', ')}`
    );
  }
  console.error(`\n❌ Found ${violations.length} hardcoded color usages outside approved theme definition files.`);
  process.exit(1);
}

console.log('\n✅ No hardcoded hex colors found outside approved theme definition files.');
