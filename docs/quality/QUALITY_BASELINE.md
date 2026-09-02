# Quality baseline

> **Generated file — do not hand-edit.** Regenerate with
> `node scripts/check-quality-baseline.mjs --report`. Thresholds are
> defined in [`scripts/check-quality-baseline.mjs`](../../scripts/check-quality-baseline.mjs)
> — that file is the single source of truth for threshold values; this
> document only reports the last measured actuals against them.
>
> Measured at: 2026-09-02
> Overall gate: ✅ PASS

No other file in this repository should restate these numbers. Rules files
(e.g. [`.agents/rules/code_quality.md`](../../.agents/rules/code_quality.md))
should link here instead of embedding metric values, since any embedded
number goes stale the next time this report is regenerated.

For the detailed per-file F-grade breakdown and specific findings, see the
latest dated snapshot in [`docs/quality/inspections/`](inspections/).

---

### `apps/web/src`

Files analyzed: **378**

| Metric | Actual | Threshold | Status |
|---|---:|---:|---|
| Average score | 90.3 | >= 80 | ✅ PASS |
| F-grade files | 5 | <= 34 | ✅ PASS |
| Code smells | 1222 | <= 2400 | ✅ PASS |
| SOLID violations | 25 | <= 25 | ✅ PASS |

### `packages`

Files analyzed: **17**

| Metric | Actual | Threshold | Status |
|---|---:|---:|---|
| Average score | 96.3 | >= 94 | ✅ PASS |
| F-grade files | 0 | <= 0 | ✅ PASS |
| Code smells | 26 | <= 75 | ✅ PASS |
| SOLID violations | 0 | <= 0 | ✅ PASS |

---

## Reproducing this report

```bash
node scripts/check-quality-baseline.mjs --report
```

This runs `code_quality_checker.py` in-memory against `apps/web/src` and
`packages`, evaluates the results against the thresholds in this script,
and writes this file. It does not commit any intermediate JSON artifacts.
