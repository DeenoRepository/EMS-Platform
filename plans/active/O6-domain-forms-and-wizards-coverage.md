---
id: O6
title: Покрыть тестами доменные формы, мастера и таблицы EPS/WMS/MRO/SRM
status: active
phase: O
priority: P2
risk: medium
skills: [senior-qa, senior-frontend]
opened: 2026-09-01
closed: null
commits: [4412195, 6d705c1, 39ae85c, bb6e427, 4d15658, 98047ff]
gates: [test, coverage, lint, tsc]
---

# O6 — Покрыть тестами доменные формы, мастера и таблицы

## Problem

Вне `components/ui` находится 125 компонентов, из которых покрыты 5:
[`AdminFeedbackFilters`](../../apps/web/src/components/feedback/AdminFeedbackFilters.test.tsx),
[`WarehouseSelect`](../../apps/web/src/components/wms/WarehouseSelect.test.tsx),
[`WmsDeficitItem`](../../apps/web/src/components/wms/WmsDeficitItem.test.tsx),
[`WmsOperationRecipientBadge`](../../apps/web/src/components/wms/WmsOperationRecipientBadge.test.tsx),
[`WmsStockZoneCell`](../../apps/web/src/components/wms/WmsStockZoneCell.test.tsx).

Распределение непокрытого:

| Каталог | Компонентов |
|---|---:|
| `components/wms` | 33 |
| `components/eps` | 33 |
| `components/layout` | 8 |
| `components/eps/reports` | 6 |
| `components/feedback` | 6 |
| `components/setup` | 5 |
| `components/srm` | 4 |
| `components/admin/settings` | 4 |
| `components/admin` | 3 |
| `components/mro`, `eps/history`, `eps/documents`, `dashboard` | по 2 |
| `components/providers` | 1 |

Это компоненты, в которых живёт клиентская часть бизнес-логики:
многошаговые мастера (создание оборудования, операции WMS, выполнение
MRO), валидация форм и построение payload. Именно они были предметом
серии рефакторингов фазы C/I — и остались без регрессионной защиты.

## Scope

Testing Library тесты для форм, мастеров и таблиц с бизнес-логикой.
Приоритет — компоненты, вокруг которых уже есть закрытые stories
рефакторинга (значит, они сложные и менялись).

Не входит: покрытие чисто презентационных обёрток без логики и
покрытие `page.tsx` целиком (страницы адресуются E2E в [`O7`](O7-e2e-flow-coverage.md)).

## Приоритетные группы

**Группа 1 — мастера и payload-билдеры (наибольший риск):**

- мастер создания оборудования (`components/eps`, см. [`C4`](../done/2026-08/C4-equipment-wizard-form-split.md), [`I1`](../done/2026-08/I1-equipment-wizard-form-steps.md));
- мастер операции WMS (см. [`C14`](../done/2026-08/C14-wms-operation-wizard-step-content.md), [`C15`](../done/2026-08/C15-wms-operation-wizard-submit.md), [`I3`](../done/2026-08/I3-wms-operation-items-step.md), [`I4`](../done/2026-08/I4-wms-operation-wizard-add-item.md));
- мастер выполнения MRO (см. [`I2`](../done/2026-08/I2-mro-execution-wizard-submit.md));
- диалог перемещения (см. [`C13`](../done/2026-08/C13-transfer-request-payload.md), [`H4`](../done/2026-08/H4-transfer-dialog-and-srm-page-complexity.md)).

**Группа 2 — паспорт оборудования и его вкладки:**
`C7`–`C12` (обзор, запчасти, KPI, техсекции, обслуживание, инциденты).

**Группа 3 — админ и настройки:** `components/admin/settings`
(см. [`C1`](../done/2026-08/C1-admin-settings-page-split.md)), `components/setup`.

**Группа 4 — отчёты и импорт:** `components/eps/reports`
(см. [`C5`](../done/2026-08/C5-eps-reports-and-smart-import.md), [`I5`](../done/2026-08/I5-eps-reports-page-decomposition.md)).

**Группа 5 — layout и провайдеры:** сайдбар (см. [`K4.1`](../done/2026-08/K4.1-sidebar-load-data.md)),
`components/providers`.

## Steps

1. Написать тесты Группы 1: для каждого мастера — переход между шагами,
   блокировка «Далее» при невалидном шаге, формирование итогового payload,
   обработка ошибки submit. Payload сверять с контрактом
   соответствующего роута из [`O2`](O2-write-path-business-logic-coverage.md).
2. Написать тесты Группы 2: рендер вкладок паспорта на фикстуре
   оборудования, пустые состояния, отображение статусов через
   `StatusBadge`.
3. Написать тесты Группы 3 и 4: сохранение настроек, валидация полей
   подключения, генерация отчёта, предпросмотр импорта.
4. Написать тесты Группы 5: сайдбар отображает только разрешённые
   модули для роли пользователя (RBAC в навигации).
5. Вынести общие фикстуры в `apps/web/src/components/__tests__/fixtures/`
   и общий `renderWithProviders` helper (theme + auth + confirm).
6. Поднять component coverage до строки «После O6»
   [`O0`](O0-coverage-roadmap.md): 25 %.

## Definition of Done

- [x] Все 4 мастера покрыты тестами переходов, валидации и payload.
- [x] Payload helpers мастеров покрыты и соответствуют контрактам O2.
- [x] Сайдбар покрыт RBAC-тестом (видимость модулей по роли).
- [x] Все новые component-тесты используют существующий `renderWithProviders` helper.
- [x] Component line coverage ≥ 25 %, порог поднят; текущий измеренный уровень — 38.60 %.
- [x] Нет тестов, ассертящих собственные моки.
- [ ] Full gate green: test, coverage, lint, tsc.

## Result

Добавлены executable-тесты payload helper-ов оборудования, перемещения и MRO, component-тесты четырёх мастеров, EPS passport tabs, admin/setup/report/import компонентов и RBAC-навигации Sidebar. Все новые component-тесты используют существующий `renderWithProviders` helper. Текущий component suite: 37 файлов; измеренное component line coverage — 38.60 %, что выше ratchet 25 %. Node suite, component suite, lint и typecheck проходят. Общий coverage gate пока не закрыт: на Node 24.15.0 метрики Node coverage составляют 79.27 % line и 47.17 % file reach при порогах 80/62; это отдельная проблема измерения Node coverage, не компонентного покрытия O6.
