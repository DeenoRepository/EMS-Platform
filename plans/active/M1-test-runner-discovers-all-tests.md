---
id: M1
title: Runner должен находить все тесты, а не два жёстко заданных каталога
status: active
phase: M
priority: P0
risk: medium
skills: [senior-qa]
opened: 2026-08-31
closed: null
commits: []
gates: [test, lint, tsc, check:docs]
---

# M1 — Runner должен находить все тесты, а не два жёстко заданных каталога

## Problem

[`scripts/test-runner.mjs:27-30`](../../scripts/test-runner.mjs:27) собирает
список файлов из **двух** директорий:

```js
const testFiles = [
  ...findTestFiles(path.join('packages', 'auth', 'src')),
  ...findTestFiles(path.join('apps', 'web', 'src', 'lib', '__tests__')),
];
```

Тест, лежащий рядом с проверяемым кодом, молча не запускается. Сейчас так
потеряно **8 файлов / 31 проверка**: `pnpm test` сообщает 193 пройденных
теста, тогда как на диске их 224.

| Файл | Проверок | Story, в которой написан |
|---|---:|---|
| [`api/eps/approvals/get-query.test.ts`](../../apps/web/src/app/api/eps/approvals/get-query.test.ts) | 3 | `K4.7` |
| [`api/eps/equipment/get-query.test.ts`](../../apps/web/src/app/api/eps/equipment/get-query.test.ts) | 3 | `K4.8` |
| [`api/eps/history/get-query.test.ts`](../../apps/web/src/app/api/eps/history/get-query.test.ts) | 4 | `K4.9` |
| [`setup/ldap-auth-result.test.ts`](../../apps/web/src/app/setup/ldap-auth-result.test.ts) | 4 | `K4.3` |
| [`wms/warehouses/warehouse-submit.test.ts`](../../apps/web/src/app/wms/warehouses/warehouse-submit.test.ts) | 4 | `K4.2` |
| [`components/layout/sidebar-load-data.test.ts`](../../apps/web/src/components/layout/sidebar-load-data.test.ts) | 4 | `K4.1` |
| [`lib/eps-import-helpers.test.ts`](../../apps/web/src/lib/eps-import-helpers.test.ts) | 5 | `K4.4` |
| [`lib/system-settings-builder.test.ts`](../../apps/web/src/lib/system-settings-builder.test.ts) | 4 | `K4.6` |

Эти проверки были приняты как Definition of Done соответствующих story, но
не выполнялись ни разу. Их фактическое состояние неизвестно.

Выявлено инспекцией
[`2026-08-31-test-coverage-inspection.md`](../../docs/quality/inspections/2026-08-31-test-coverage-inspection.md) §3.1.

## Scope

**Изменяется:** [`scripts/test-runner.mjs`](../../scripts/test-runner.mjs) —
автообнаружение тестов по всему монорепозиторию; при необходимости
исправляются сами «ожившие» тесты, если они упали.

**Не изменяется:**
- Прикладной код `apps/`/`packages/`. Если ожившая проверка падает из-за
  реального дефекта — она не «подгоняется» под текущее поведение:
  заводится отдельная story, а тест до её закрытия помечается
  `test.todo` с ссылкой на неё.
- E2E: `apps/web/e2e/**` остаётся вне `pnpm test` (см.
  [`playwright.config.ts:6-7`](../../apps/web/playwright.config.ts:6)) —
  ему нужны БД и сборка.
- Механика запуска: `--experimental-test-module-mocks --import tsx`
  сохраняется, обоснование — в комментарии
  [`test-runner.mjs:32-39`](../../scripts/test-runner.mjs:32).

## Steps

1. Заменить жёсткий список на обход `apps/` и `packages/` с исключениями:
   `node_modules`, `.next`, `dist`, `apps/web/e2e`.
2. Прогнать. Разобрать каждое падение: дефект теста → чинить здесь;
   дефект приложения → `test.todo` + новая story.
3. Добавить в runner защиту от повторения проблемы: печатать число
   найденных файлов и падать, если оно меньше ожидаемого минимума,
   заданного константой в самом runner.
4. Задокументировать соглашение «тест лежит рядом с кодом либо в
   `__tests__/`; оба варианта обнаруживаются автоматически» в
   [`scripts/README.md`](../../scripts/README.md).

## Definition of Done

- [ ] `pnpm test` находит все 36 юнит-файлов (не 28).
- [ ] Выполняется 224 проверки (не 193); падений — 0.
- [ ] Каждый `test.todo`, если появился, ссылается на созданную story.
- [ ] Файлы из `apps/web/e2e/` в прогон не попали.
- [ ] Полный гейт зелёный: `test`, `lint`, `tsc`, `check:docs`.

## Result

Заполняется при закрытии story.
