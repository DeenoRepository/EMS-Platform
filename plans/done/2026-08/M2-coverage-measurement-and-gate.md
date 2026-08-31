---
id: M2
title: Измерять покрытие тестами и закрепить его порогом в CI
status: done
phase: M
priority: P0
risk: low
skills: [senior-qa, ci-cd-pipeline-builder]
opened: 2026-08-31
closed: 2026-08-31
commits: [4b91888]
gates: [test, lint, tsc, check:docs, check:quality]
---

# M2 — Измерять покрытие тестами и закрепить его порогом в CI

## Problem

Покрытие не измерялось. `--experimental-test-coverage` нигде не был
подключён. CI имел 12 гейтов — покрытия среди них не было. Удаление теста
не замечал ни один гейт.

Выявлено инспекцией
[`2026-08-31-test-coverage-inspection.md`](../../docs/quality/inspections/2026-08-31-test-coverage-inspection.md) §3.2.

## Scope

**Изменено:**
- [`scripts/test-runner.mjs`](../../scripts/test-runner.mjs) — флаг `--coverage`
  пробрасывает `--experimental-test-coverage`.
- [`scripts/check-coverage.mjs`](../../scripts/check-coverage.mjs) — новый
  гейт с двумя метриками и `--report`.
- [`docs/quality/COVERAGE_BASELINE.md`](../../docs/quality/COVERAGE_BASELINE.md) — генерируемый отчёт.
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — добавлен шаг
  «Run Coverage Gate and Verify Baseline».
- [`docs/README.md`](../../docs/README.md),
  [`scripts/README.md`](../../scripts/README.md) — ссылки на новый отчёт.

## Result

- ✅ `pnpm test` без флага не собирает покрытие и не замедлился.
- ✅ `node scripts/check-coverage.mjs` печатает две метрики и падает ниже порога:
  - Строки среди загруженных файлов: **83.27 %** (порог ≥ 80 %).
  - Охват файлов: **20.22 %** (порог ≥ 14 %; до M1 было 11.7 %).
- ✅ `docs/quality/COVERAGE_BASELINE.md` генерируется; повторный запуск при
  неизменном коде оставляет `git diff` чистым (дата сохраняется).
- ✅ Метрики явно разделены: «строки среди загруженных» и «охват файлов» —
  пояснение, почему это не одно и то же, включено в отчёт.
- ✅ CI содержит шаг проверки покрытия.
- ✅ Новых npm-зависимостей не добавлено (Node 22 natively).
