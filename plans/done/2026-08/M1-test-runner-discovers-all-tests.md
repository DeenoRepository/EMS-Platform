---
id: M1
title: Runner должен находить все тесты, а не два жёстко заданных каталога
status: done
phase: M
priority: P0
risk: medium
skills: [senior-qa]
opened: 2026-08-31
closed: 2026-08-31
commits: [4b91888]
gates: [test, lint, tsc, check:docs]
---

# M1 — Runner должен находить все тесты, а не два жёстко заданных каталога

## Problem

[`scripts/test-runner.mjs:27-30`](../../../scripts/test-runner.mjs:27) собирал
список файлов из **двух** директорий:

```js
const testFiles = [
  ...findTestFiles(path.join('packages', 'auth', 'src')),
  ...findTestFiles(path.join('apps', 'web', 'src', 'lib', '__tests__')),
];
```

Тест, лежащий рядом с проверяемым кодом, молча не запускался. Потеряно
**8 файлов / 31 проверка**: `pnpm test` сообщал 193 пройденных теста,
тогда как на диске их 224.

Выявлено инспекцией
[`2026-08-31-test-coverage-inspection.md`](../../../docs/quality/inspections/2026-08-31-test-coverage-inspection.md) §3.1.

## Scope

**Изменён:** [`scripts/test-runner.mjs`](../../../scripts/test-runner.mjs) —
автообнаружение тестов по всему монорепозиторию.

## Result

- ✅ `pnpm test` теперь находит **36** юнит-файлов (было 28).
- ✅ Выполняется **224** проверки (было 193); падений — 0.
- ✅ Добавлена защита `MINIMUM_TEST_FILE_COUNT = 36` — runner падает, если
  файлов меньше константы.
- ✅ Добавлена переменная окружения `TSX_TSCONFIG_PATH=apps/web/tsconfig.json`
  так что тесты роутов видят `@/`-алиасы.
- ✅ E2E-файлы из `apps/web/e2e/` в прогон не попали.
- ✅ Соглашение о размещении тестов задокументировано в
  [`scripts/README.md`](../../../scripts/README.md).
- ✅ Все 8 «ожившых» тестов прошли без изменений production-кода.
- ✅ `check:docs` зелёный.
