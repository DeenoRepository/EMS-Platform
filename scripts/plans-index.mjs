#!/usr/bin/env node
/**
 * Generates plans/README.md from YAML front-matter of every story file in
 * plans/active/ and plans/done/**. This is the single generator for the
 * "current work" ledger — do not hand-edit plans/README.md.
 *
 * Usage:
 *   node scripts/plans-index.mjs            # regenerate plans/README.md
 *   node scripts/plans-index.mjs --check    # verify plans/README.md is up to date (CI)
 *
 * Validation performed on every run (fails the process, exit 1):
 *   - required front-matter fields present on every story
 *   - status: done is not allowed inside plans/active/
 *   - files under plans/done/ must have status: done and a closed date
 *   - files under plans/done/ must list at least one commit OR explicitly
 *     document why not (see ALLOW_EMPTY_COMMITS below)
 *   - closed date must not be earlier than opened date
 *
 * Non-fatal warnings (printed, do not fail the process):
 *   - stories in plans/active/ older than STALE_DAYS with no recent commits
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(process.cwd());
const plansDir = path.join(repositoryRoot, 'plans');
const activeDir = path.join(plansDir, 'active');
const doneDir = path.join(plansDir, 'done');
const readmePath = path.join(plansDir, 'README.md');

// Days after which an open story with no forward progress is flagged as
// potentially stuck. This is a warning, not a gate — some stories are
// legitimately long-running (e.g. Sidebar.tsx stop-file work).
const STALE_DAYS = 30;

// Story IDs allowed to have an empty commits list in plans/done/ because
// the source material (original REMEDIATION_PLAN.md) recorded only a
// commit *message*, not a SHA, for these stories at migration time — see
// each story's "Result" section for the recorded message. Do not invent a
// SHA to satisfy this check; add the real one when it becomes known and
// remove the ID from this list. Do not add new IDs here casually — an
// empty commits list on a done story is normally a sign the Result section
// was never filled in.
const ALLOW_EMPTY_COMMITS = new Set([
  'A1', 'A2', 'A3',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C3', 'C4', 'C5',
  'E', 'J3',
]);

const REQUIRED_FIELDS = [
  'id',
  'title',
  'status',
  'phase',
  'priority',
  'risk',
  'skills',
  'opened',
  'closed',
  'commits',
  'gates',
];

function walkMarkdownFiles(dir) {
  let results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Minimal YAML front-matter parser scoped to the flat schema used by
 * plans/templates/story.md. Supports: strings, null, and single-line
 * flow arrays like `[a, b, c]` or `[]`. Not a general YAML parser.
 */
function parseFrontMatter(content, filePath) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`No YAML front-matter found in ${filePath}`);
  }
  const raw = match[1];
  const data = {};
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();

    if (value === 'null' || value === '') {
      data[key] = null;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      data[key] = inner === '' ? [] : inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    } else {
      data[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  return data;
}

function loadStory(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const data = parseFrontMatter(content, filePath);
  const missing = REQUIRED_FIELDS.filter((field) => !(field in data));
  if (missing.length > 0) {
    throw new Error(`${filePath}: missing required front-matter fields: ${missing.join(', ')}`);
  }
  return {
    // Used in error messages: path relative to repo root.
    filePath: path.relative(repositoryRoot, filePath).replace(/\\/g, '/'),
    // Used for markdown links from plans/README.md (which lives in plansDir).
    linkPath: path.relative(plansDir, filePath).replace(/\\/g, '/'),
    ...data,
  };
}

const errors = [];
const activeStories = [];
const doneStories = [];

for (const filePath of walkMarkdownFiles(activeDir)) {
  try {
    const story = loadStory(filePath);
    if (story.status === 'done') {
      errors.push(`${story.filePath}: status: done is not allowed inside plans/active/ — move the file to plans/done/YYYY-MM/`);
    }
    activeStories.push(story);
  } catch (err) {
    errors.push(err.message);
  }
}

function isValidIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

for (const filePath of walkMarkdownFiles(doneDir)) {
  try {
    const story = loadStory(filePath);
    if (story.status !== 'done') {
      errors.push(`${story.filePath}: files under plans/done/ must have status: done (found "${story.status}")`);
    }
    if (!story.closed) {
      errors.push(`${story.filePath}: files under plans/done/ must set a closed date`);
    } else if (isValidIsoDate(story.opened) && isValidIsoDate(story.closed) && story.closed < story.opened) {
      errors.push(`${story.filePath}: closed (${story.closed}) is earlier than opened (${story.opened})`);
    }
    const hasCommits = Array.isArray(story.commits) && story.commits.length > 0;
    if (!hasCommits && !ALLOW_EMPTY_COMMITS.has(story.id)) {
      errors.push(
        `${story.filePath}: done story has an empty commits list and is not in ALLOW_EMPTY_COMMITS — ` +
          `either record the commit SHA or add the ID to the allowlist in scripts/plans-index.mjs with a reason`
      );
    }
    doneStories.push(story);
  } catch (err) {
    errors.push(err.message);
  }
}

if (errors.length > 0) {
  console.error('plans-index: validation errors:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

// --- Non-fatal: warn about active stories with no forward progress ---
const staleWarnings = [];
const now = Date.now();
for (const story of activeStories) {
  if (!isValidIsoDate(story.opened)) continue;
  const openedMs = Date.parse(story.opened + 'T00:00:00Z');
  const ageDays = Math.floor((now - openedMs) / (24 * 60 * 60 * 1000));
  const hasCommits = Array.isArray(story.commits) && story.commits.length > 0;
  if (ageDays >= STALE_DAYS && !hasCommits) {
    staleWarnings.push(`${story.filePath}: opened ${ageDays} days ago, no commits recorded yet (stale threshold: ${STALE_DAYS}d)`);
  }
}
if (staleWarnings.length > 0) {
  console.warn('plans-index: stale active story warnings (not blocking):');
  for (const w of staleWarnings) console.warn(`  - ${w}`);
}

function sortByPhaseThenId(a, b) {
  if (a.phase !== b.phase) return String(a.phase).localeCompare(String(b.phase));
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
}

activeStories.sort(sortByPhaseThenId);
doneStories.sort((a, b) => {
  if (a.closed !== b.closed) return String(a.closed).localeCompare(String(b.closed));
  return sortByPhaseThenId(a, b);
});

function renderActiveTable(stories) {
  if (stories.length === 0) return '_No active stories._\n';
  const header = '| ID | Title | Phase | Priority | Risk | Skills | Opened |\n|---|---|---|---|---|---|---|\n';
  const rows = stories
    .map(
      (s) =>
        `| [${s.id}](${s.linkPath}) | ${s.title} | ${s.phase} | ${s.priority} | ${s.risk} | ${s.skills.join(', ')} | ${s.opened} |`
    )
    .join('\n');
  return header + rows + '\n';
}

function renderDoneTable(stories) {
  if (stories.length === 0) return '_No closed stories yet._\n';
  const header = '| ID | Title | Phase | Closed | Commits |\n|---|---|---|---|---|\n';
  const rows = stories
    .map((s) => {
      const commits = Array.isArray(s.commits) && s.commits.length > 0 ? s.commits.join(', ') : '—';
      return `| [${s.id}](${s.linkPath}) | ${s.title} | ${s.phase} | ${s.closed} | ${commits} |`;
    })
    .join('\n');
  return header + rows + '\n';
}

const generatedAt = new Date().toISOString().slice(0, 10);

const content = `# Plans — work ledger

> **Generated file — do not hand-edit.** Regenerate with \`node scripts/plans-index.mjs\`
> after adding, editing, or closing a story. Source of truth is the YAML
> front-matter in each file under \`plans/active/\` and \`plans/done/\`.
>
> Last generated: ${generatedAt}

## Lifecycle

1. Create \`plans/active/<id>-<slug>.md\` from [\`plans/templates/story.md\`](templates/story.md).
2. Work the story. One story = one file = one Conventional Commit on close.
3. On close: set \`status: done\`, fill \`closed:\` and \`commits:\`, fill the
   **Result** section, then \`git mv\` the file into \`plans/done/YYYY-MM/\`.
4. Run \`node scripts/plans-index.mjs\` to regenerate this file.
5. Unscheduled or conditional work lives in [\`plans/BACKLOG.md\`](BACKLOG.md),
   not here.

Current quality metrics are **not** tracked in this file — see
[\`docs/quality/QUALITY_BASELINE.md\`](../docs/quality/QUALITY_BASELINE.md)
(generated by \`node scripts/check-quality-baseline.mjs --report\`).

---

## Active (${activeStories.length})

${renderActiveTable(activeStories)}
---

## Backlog

Unscheduled, conditional items — see [\`plans/BACKLOG.md\`](BACKLOG.md).

---

## Done (${doneStories.length})

${renderDoneTable(doneStories)}`;

const isCheckMode = process.argv.includes('--check');

if (isCheckMode) {
  let existing = '';
  try {
    existing = readFileSync(readmePath, 'utf8');
  } catch {
    console.error('plans-index --check: plans/README.md does not exist. Run `node scripts/plans-index.mjs` first.');
    process.exit(1);
  }
  const normalize = (s) => s.replace(/Last generated: \d{4}-\d{2}-\d{2}/, 'Last generated: <date>');
  if (normalize(existing) !== normalize(content)) {
    console.error('plans-index --check: plans/README.md is stale. Run `node scripts/plans-index.mjs` and commit the result.');
    process.exit(1);
  }
  console.log('plans-index --check: PASS — plans/README.md is up to date.');
  process.exit(0);
}

writeFileSync(readmePath, content, 'utf8');
console.log(`plans-index: wrote ${path.relative(repositoryRoot, readmePath)} (${activeStories.length} active, ${doneStories.length} done).`);
