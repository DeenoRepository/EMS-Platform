// ─── М4 audit note ────────────────────────────────────────────────────────────
// This file previously contained LOCAL function declarations for normalizeHeader,
// matchColumn, validateImportRow, and validateFileUpload — none of which imported
// production code. All test assertions were verifying copies of logic, not the
// real implementations (tautological tests).
//
// The file has been cleaned. Equivalent real-import tests were migrated:
//   • normalizeHeader  → apps/web/src/lib/eps-import-helpers.test.ts
//   • ALLOWED_EXTENSIONS validation → apps/web/src/lib/__tests__/storage.test.ts
//
// Backlog items filed for missing production extractions:
//   • BACKLOG-EPS-01  Extract column matchColumn logic from eps-import-matcher.ts
//   • BACKLOG-EPS-02  Extract import row collision detection to a pure utility
// ─────────────────────────────────────────────────────────────────────────────
//
// This file intentionally contains no tests. It is kept as a placeholder so the
// audit trail above is preserved in git history. Remove it once the backlog items
// are resolved and real tests exist in apps/web.
