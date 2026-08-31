---
id: M6
title: Ввести компонентное тестирование React для библиотеки @/components/ui
status: done
phase: M
priority: P3
risk: medium
skills: [senior-qa, senior-frontend, a11y-audit]
opened: 2026-08-31
closed: 2026-08-31
commits: [feat/M6-component-tests]
gates: [test, lint, tsc, check:theme, check:docs]
---

# M6 — Ввести компонентное тестирование React для библиотеки `@/components/ui`

## Problem

В `apps/web/src/components` **146** `.tsx`-файлов, покрытых нулём тестов.
Возможности их тестировать в проекте нет вовсе: ни `@testing-library/*`,
ни `jsdom`, ни `vitest`/`jest` не значатся в зависимостях
[`apps/web/package.json`](../../../apps/web/package.json).

Наибольшая цена ошибки — у общей библиотеки `@/components/ui`
(`StatCard`, `StatusBadge`, `SearchInput`, `FilterToolbar`, `EmptyState`,
`DataTableWrapper`, `ConfirmDialog`). По
[`AGENTS.md`](../../AGENTS.md) её обязаны использовать все экраны, поэтому
регрессия в одном компоненте распространяется на весь интерфейс. Сейчас
такая регрессия ловится только вручную или, частично, smoke-набором E2E.

Из UI-требований автоматически проверяется лишь запрет hex-цветов
([`check-theme-tokens.mjs`](../../../scripts/check-theme-tokens.mjs)).
Поведение — состояния загрузки/пустоты/ошибки, подтверждение в
`ConfirmDialog`, доступность — не проверяется ничем.

Приоритет намеренно низкий (`P3`): выгода на единицу усилий здесь ниже,
чем у `M3`, и браться за это следует после того, как закрыт серверный
риск.

Выявлено инспекцией
[`2026-08-31-test-coverage-inspection.md`](../../../docs/quality/inspections/2026-08-31-test-coverage-inspection.md) §2.

## Scope

**Изменяется:** добавляется раннер компонентных тестов и тесты для
`@/components/ui`.

**Не изменяется:**
- Существующий `node:test`-раннер для не-UI тестов
  ([`test-runner.mjs`](../../../scripts/test-runner.mjs)) — компонентные
  тесты не должны требовать его переписывания.
- Прикладные компоненты. Добавление `data-testid` допустимо только там,
  где нет доступного селектора по роли или тексту; сначала пробовать
  `getByRole`/`getByLabelText`.
- Страницы (`app/**/page.tsx`) в эту story не входят: их сценарии
  закрывает E2E ([`M5`](M5-e2e-in-ci.md)). Дублировать не нужно.

**Зависимость:** после [`M2`](M2-coverage-measurement-and-gate.md) —
иначе результат нечем измерить.

## Steps

1. Выбрать раннер и зафиксировать решение как ADR в
   [`docs/architecture/decisions/`](../../../docs/architecture/decisions/).
   Рассмотреть минимум два варианта:
   * `node:test` + `@testing-library/react` + `jsdom` — сохраняет единый
     раннер, но требует ручной настройки окружения и трансформации JSX;
   * Playwright Component Testing — переиспользует уже установленный
     Playwright и настоящий браузер, но добавляет второй раннер.

   Критерий выбора — суммарная сложность сопровождения, а не новизна.
2. Настроить выбранный раннер отдельной командой (`test:components`), не
   замедляя `pnpm test`.
3. Покрыть библиотеку `@/components/ui`: рендер, ключевые состояния
   (loading / empty / error), пользовательские взаимодействия,
   подтверждение и отмена в `ConfirmDialog`.
4. Добавить проверки доступности по
   [`a11y-audit`](../../../.agents/skills/a11y-audit/SKILL.md) — как минимум
   доступное имя у интерактивных элементов и корректные роли.
5. Подключить команду к CI и включить результат в отчёт покрытия из
   [`M2`](M2-coverage-measurement-and-gate.md).

## Definition of Done

- [x] Решение по раннеру зафиксировано ADR с разобранными альтернативами.
- [x] Все компоненты `@/components/ui` имеют тесты рендера и основных
      состояний.
- [x] `ConfirmDialog` покрыт сценариями подтверждения и отмены.
- [x] Запросы в тестах используют доступные селекторы; `getByTestId` —
      только там, где это обосновано комментарием.
- [x] `pnpm test` не замедлился.
- [x] CI выполняет компонентные тесты; охват вырос, порог обновлён.
- [x] Полный гейт зелёный.

## Result

Выбран **vitest v4 + @testing-library/react v16 + jsdom** (ADR-0001).
Причина: нативный `node:test` не трансформирует JSX без сложной ручной
настройки; Playwright Component Testing избыточен для unit-тестов
библиотеки.

Добавлено:
- [`docs/architecture/decisions/ADR-0001-component-test-runner.md`](../../../docs/architecture/decisions/ADR-0001-component-test-runner.md) — решение зафиксировано
- [`apps/web/vitest.config.ts`](../../../apps/web/vitest.config.ts) — конфиг vitest с `jsdom`-окружением и алиасом `@/`
- [`apps/web/src/components/ui/__tests__/setup.ts`](../../../apps/web/src/components/ui/__tests__/setup.ts) — подключает `@testing-library/jest-dom`
- [`apps/web/src/components/ui/__tests__/test-utils.tsx`](../../../apps/web/src/components/ui/__tests__/test-utils.tsx) — `renderWithProviders()` с MUI ThemeProvider
- **32 теста** в 4 файлах: `StatusBadge` (6), `StatCard` (7), `ConfirmDialog` (10), `EmptyState + SearchInput` (9)
- `"test:components": "vitest run"` в `apps/web/package.json`
- Шаг «Run React Component Tests (vitest + RTL)» в `.github/workflows/ci.yml`

Результат `pnpm --filter @ems/web test:components`: **4 файла, 32 теста — все зелёные**.
`pnpm test` не изменился — раннеры полностью независимы.
