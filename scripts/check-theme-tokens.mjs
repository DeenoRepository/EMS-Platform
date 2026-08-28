#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = process.argv[2] || 'apps/web/src';

const HEX_PATTERN = /sx=\{[^}]*#[0-9a-fA-F]{3,8}[^}]*\}/s;
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
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (line.includes('sx=') || line.includes('iconColor=') || line.includes('accentColor=') || line.includes('bgcolor:')) {
      const matches = line.match(HEX_MATCH);
      if (matches) {
        // Exclude theme definition files where hex palette is defined
        if (!filePath.includes('/theme/')) {
          violationsCount++;
          console.warn(`[UI Design Code] ${path.relative(process.cwd(), filePath)}:${index + 1} - Found hardcoded hex color: ${matches.join(', ')}`);
        }
      }
    }
  });
}

if (violationsCount > 0) {
  console.log(`\nFound ${violationsCount} hardcoded color usages across scanned files.`);
} else {
  console.log(`\nNo hardcoded hex colors found in scanned files.`);
}
