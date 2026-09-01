---
id: O5
title: Покрыть Testing Library все reusable UI primitives из components/ui
status: done
phase: O
priority: P2
risk: low
skills: [senior-qa, senior-frontend, a11y-audit]
opened: 2026-09-01
closed: 2026-09-01
commits: [pending]
gates: [test, coverage, lint, tsc]
---

# O5 — Покрыть Testing Library все reusable UI primitives

## Problem

Component line coverage — 2.63 % при пороге 1 %. Из 35 файлов в
[`components/ui`](../../../apps/web/src/components/ui) тесты есть у 8:
`ConfirmDialog`, `DataTableColumnSelector`, `DataTableDensityToggle`,
`EmptyState`+`SearchInput`, `ErrorState`, `StatCard`, `StatusBadge`,
`TabPanel`.

Непокрытые primitives, которые переиспользуются на всех страницах и
поэтому дают максимальный охват на единицу усилия:

| Компонент | Почему важен |
|---|---|
| `DataTableWrapper` | базовая таблица всех реестров |
| `FilterToolbar` | фильтрация во всех модулях |
| `FormDialog` | все формы создания/правки |
| `ConfirmProvider` | контекст подтверждений |
| `PermissionGate` | **скрытие UI по RBAC — security-релевантно** |
| `ErrorBoundary` | деградация при падении дерева |
| `FileUploadDropzone` | загрузка вложений |
| `DynamicFieldRenderer` | рендер кастомных полей паспорта |
| `DatePickerField` | ввод дат |
| `ExportButton` | выгрузки |
| `BulkActionBar` | массовые операции |
| `CommandPalette` | навигация |
| `ApprovalStepper`, `LifecycleTimeline` | статусные цепочки |
| `HealthScoreGauge`, `TrendSparkline`, `ChartCard` | KPI |
| `CurrencyDisplay` | форматирование сумм |
| `ActivityFeed`, `DetailDrawer`, `DocumentPreviewDialog` | детали |
| `CriticalAlertBanner`, `InfrastructureHealthBanner`, `ModuleMaintenanceState`, `PageLoading` | состояния |
| `statusBadgeConfig` | конфигурация статусов |

`PermissionGate` — приоритет P1 внутри этой story: он реализует
UI-часть RBAC, и его регрессия показывает пользователю действия,
на которые у него нет прав.

## Scope

Vitest + Testing Library тесты в
[`components/ui/__tests__/`](../../../apps/web/src/components/ui/__tests__)
по конфигурации [`vitest.config.ts`](../../../apps/web/vitest.config.ts).

Не входит: изменение API компонентов и визуального поведения.

## Правила для тестов этой story

- Запросы только по доступным ролям: `getByRole`, `getByLabelText`;
  `getByTestId` — только когда роль недоступна принципиально.
- Каждый интерактивный компонент проверяется на: рендер, взаимодействие,
  disabled-состояние, пустое состояние.
- Для компонентов с `aria`-семантикой добавить проверку атрибутов
  согласно [`a11y-audit`](../../../.agents/skills/a11y-audit/SKILL.md).
- Запрещены snapshot-тесты без ассертов поведения.

## Steps

1. `PermissionGate.test.tsx`: рендерит children при наличии permission,
   не рендерит при отсутствии, корректно обрабатывает пустой список
   permissions и fallback-проп.
2. `DataTableWrapper.test.tsx`: рендер строк, пустое состояние,
   состояние загрузки, сортировка по клику на заголовок.
3. `FilterToolbar.test.tsx` + `FormDialog.test.tsx` +
   `ConfirmProvider.test.tsx`: открытие/закрытие, submit, cancel,
   сброс фильтров.
4. `ErrorBoundary.test.tsx`: перехват исключения дочернего компонента,
   рендер fallback, отсутствие утечки stack trace в UI.
5. `FileUploadDropzone.test.tsx`: принятие валидного файла, отклонение
   по размеру и MIME, множественная загрузка.
6. `DynamicFieldRenderer.test.tsx`: рендер каждого поддерживаемого типа
   поля, required-валидация, значение по умолчанию.
7. Остальные primitives — по одному тесту на компонент, покрывающему
   основной и граничный кейс.
8. Расширить `include` в vitest coverage при необходимости и поднять
   порог component coverage до строки «После O5»
   [`O0`](../../active/O0-coverage-roadmap.md): 12 %.

## Definition of Done

- [x] Все reusable UI primitives с исполняемым поведением имеют тесты; чисто типовые exports исключены.
- [x] `PermissionGate` покрыт позитивным и негативным RBAC-кейсом.
- [x] Нет snapshot-only тестов.
- [x] `pnpm --filter @ems/web test:components` зелёный.
- [x] Component line coverage ≥ 12 %, порог поднят, baseline перегенерирован.
- [x] Full gate green: test, coverage, lint, tsc.

## Result

Добавлены четыре component suites для критических, составных, аналитических и оставшихся UI primitives. Component suite выполняет 18 test files и 92 теста; component line coverage достигла 73.92 %. Ratchet поднят с 1 % до 12 % в [`scripts/check-coverage.mjs`](../../../scripts/check-coverage.mjs), а [`docs/quality/COVERAGE_BASELINE.md`](../../../docs/quality/COVERAGE_BASELINE.md) перегенерирован. Node suite: 100 файлов, 602 проверки; route gate и документационный gate проходят.
