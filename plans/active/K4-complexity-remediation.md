---
id: K4
title: Снизить реальную цикломатическую сложность приоритетных функций
status: active
phase: K
priority: P2
risk: medium
skills: [senior-frontend, senior-backend, zero-hallucination-coder]
opened: 2026-08-30
closed: null
commits: [5ef7e08]
gates: [test, lint, tsc, check:quality]
---

# K4 — Снизить реальную цикломатическую сложность приоритетных функций

## Problem

После Phase I в web остаются функции выше нормативного порога сложности.
Приоритет инспекции — реальная бизнес-логика, а не известные TSX
false-positive границы render-функций. Наиболее ценные цели: обработчик
сохранения WMS warehouses, setup LDAP test handler, загрузчик статистики WMS,
`makeEnglishSlug`, а также отдельные SRM/WMS dialog handlers.

## Scope

- Выполнять декомпозицию отдельными bounded-подисториями, по одной логической
  области за commit.
- Сначала покрыть чистые builders/validators/models тестами, затем сократить
  orchestration handlers.
- Сохранить API-контракты, права, rate limiting, UI-поведение и Prisma semantics.
- Не рефакторить presentation-only F-grade файлы только ради score.
- Не выполнять массовую замену layout magic numbers или типов.

## Steps

1. Повторно измерить кандидатов через quality checker и проверить границы
   функций чтением исходников.
2. Создать отдельную story для первой функции с максимальным реальным `cx`.
3. Вынести pure validation/payload/response helpers рядом с владельцем.
4. Добавить тесты на ветвления и ошибки, не меняя внешний контракт.
5. Повторить для следующих кандидатов, закрывая каждую story отдельным
   Conventional Commit.

## Definition of Done

- [ ] Для каждой подистории целевая функция имеет complexity ≤ 10 либо
  документированное обоснование исключения.
- [ ] Поведение покрыто тестами до/после рефакторинга.
- [ ] Нет новых F-grade regressions, lint/tsc/test gates зелёные.
- [ ] Изменения не смешивают security, UI и unrelated refactoring.

## Result

Шаг 1 выполнен 2026-08-30: quality checker повторно измерил кандидатов,
после чего границы функций проверены чтением исходников. Максимальная реальная
цикломатическая сложность среди проверенных приоритетных кандидатов — `loadData`
в [`Sidebar.tsx`](../../apps/web/src/components/layout/Sidebar.tsx): `cx 46`,
79 строк, семь независимых response branches. Presentation-only и известные
false-positive кандидаты исключены из приоритета.

Первая bounded-подистория создана в
[`K4.1-sidebar-load-data.md`](K4.1-sidebar-load-data.md): вынести только
orchestration/response mapping `loadData`, затем покрыть ветвления pure helper
тестами и проверить отсутствие изменений sidebar/API-поведения.

Вторая bounded-подистория [`K4.2-wms-warehouses-handle-submit.md`](K4.2-wms-warehouses-handle-submit.md)
закрыта коммитом `5ef7e08`: request execution и response mapping сохранения
складов вынесены из `handleSubmit`, добавлены focused tests, а остаточная
сложность `cx 12` документирована как orchestration boundary с двумя
неустранимыми без изменения поведения ветвлениями. Все gates зелёные.
