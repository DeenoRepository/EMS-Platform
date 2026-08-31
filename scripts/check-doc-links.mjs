#!/usr/bin/env node
/**
 * Checks local Markdown links and reports missing repository files.
 * External URLs, mailto links, anchors, and code spans are ignored.
 *
 * Usage:
 *   node scripts/check-doc-links.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const markdownFiles = [];

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', '.turbo', 'temp', 'uploads', 'skills'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.md')) markdownFiles.push(fullPath);
  }
}

walk(root);

const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
const errors = [];
const REMOVED_HISTORICAL_TARGETS = new Set([
  'packages/auth/src/eps-import.test.ts',
  'packages/auth/src/srm-service.test.ts',
]);

function isAllowedRemovedHistoricalLink(sourceFile, resolvedTarget) {
  const relativeSource = path.relative(root, sourceFile).replace(/\\/g, '/');
  const relativeTarget = path.relative(root, resolvedTarget).replace(/\\/g, '/');
  const isImmutableHistory =
    relativeSource.startsWith('docs/quality/inspections/') ||
    relativeSource.startsWith('plans/done/');
  return isImmutableHistory && REMOVED_HISTORICAL_TARGETS.has(relativeTarget);
}

function maskCode(source) {
  // Replace code content with spaces while preserving newlines, so match
  // offsets still map to the original line numbers. Markdown examples in
  // skills frequently contain pseudo-links and must not be treated as live
  // repository links.
  return source
    .replace(/```[\\s\\S]*?```/g, (block) => block.replace(/[^\\r\\n]/g, ' '))
    .replace(/`[^`\\r\\n]*`/g, (inline) => inline.replace(/[^\\r\\n]/g, ' '));
}

for (const filePath of markdownFiles) {
  const source = readFileSync(filePath, 'utf8');
  const scanSource = maskCode(source);
  for (const match of scanSource.matchAll(linkPattern)) {
    const target = match[1].trim().replace(/^<|>$/g, '');

    // Validate only actual links whose target looks like a repository path
    // or URL; anchors and malformed pseudo-links are intentionally ignored.
    if (
      !target ||
      target.startsWith('#') ||
      /[{}]/.test(target) ||
      /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)
    ) continue;

    const withoutAnchor = target.split('#', 1)[0];
    if (!withoutAnchor) continue;

    // Source links in reports may include a human-readable line suffix,
    // e.g. `route.ts:108`. Resolve the file path, not the suffix.
    const fileTarget = withoutAnchor.replace(/:\d+(?:-\d+)?$/, '');
    const resolved = path.resolve(path.dirname(filePath), fileTarget);
    if (!existsSync(resolved) && !isAllowedRemovedHistoricalLink(filePath, resolved)) {
      const line = scanSource.slice(0, match.index).split(/\r?\n/).length;
      errors.push(`${path.relative(root, filePath).replace(/\\/g, '/')}:${line} -> ${target}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Markdown link check: FAIL');
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(`Markdown link check: PASS (${markdownFiles.length} project files scanned; .agents/skills examples excluded).`);
