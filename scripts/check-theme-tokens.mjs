#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = process.argv[2] || 'apps/web/src';

const HEX_MATCH = /#[0-9a-fA-F]{3,8}/g;

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '__tests__') {
        scanDirectory(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

const files = scanDirectory(path.resolve(process.cwd(), TARGET_DIR));
let violationsCount = 0;

for (const filePath of files) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  // Exclude theme definition files and tests where raw palette definitions or test tokens are defined
  if (normalizedPath.includes('/theme/') || normalizedPath.includes('__tests__') || normalizedPath.includes('migrate-')) {
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Only check lines that look like styles, JSX props or styling objects
    if (
      line.includes('sx=') ||
      line.includes('iconColor=') ||
      line.includes('accentColor=') ||
      line.includes('bgcolor:') ||
      line.includes('backgroundColor:') ||
      line.includes('borderColor:') ||
      line.includes('color:') ||
      line.includes('background:')
    ) {
      const matches = line.match(HEX_MATCH);
      if (matches) {
        violationsCount++;
        console.warn(`[UI Design Code] ${path.relative(process.cwd(), filePath)}:${index + 1} - Found hardcoded hex color: ${matches.join(', ')}`);
      }
    }
  });
}

if (violationsCount > 0) {
  console.error(`\n❌ Found ${violationsCount} hardcoded color usages across scanned files.`);
  process.exit(1);
} else {
  console.log(`\n✅ No hardcoded hex colors found in scanned files. Design code compliance verified.`);
  process.exit(0);
}
