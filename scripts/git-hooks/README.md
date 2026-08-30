# Git hooks (optional, local)

This directory holds versioned git hooks. They are **not** installed by
default — git only runs hooks from `.git/hooks/`, which is not tracked.

## One-time setup

```bash
git config core.hooksPath scripts/git-hooks
```

This tells your local git to look here instead of `.git/hooks/`. It is a
per-clone setting, not committed — every contributor who wants the hook
active runs this once.

## What's here

- **`pre-commit`** — if the commit stages any `plans/active/**/*.md` or
  `plans/done/**/*.md` file, regenerates `plans/README.md` via
  `node scripts/plans-index.mjs` and re-stages it, so a story edit can never
  be committed with a stale ledger. No-op for commits that don't touch
  `plans/`. If `plans-index.mjs` reports a validation error (missing
  front-matter, `status: done` inside `active/`, etc.), the commit is
  blocked with the error printed.

This is a convenience, not a substitute for the CI gate in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (`plans-index.mjs --check`),
which remains the actual enforcement point for anyone who hasn't run the
`git config` command above.
