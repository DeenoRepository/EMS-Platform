// ─── М4 misplaced-test cleanup ────────────────────────────────────────────────
// This file was moved to its correct location:
//   apps/web/src/lib/__tests__/srm-service.test.ts
//
// Reason: a test in packages/auth must not import from apps/web via relative
// ../../../../ paths. The package boundary is violated and the test runner can
// only find it because TSX_TSCONFIG_PATH points at apps/web/tsconfig.json.
//
// This placeholder is kept so git history shows the move clearly.
// The file contains no test() calls and is ignored by the runner.
// ─────────────────────────────────────────────────────────────────────────────
