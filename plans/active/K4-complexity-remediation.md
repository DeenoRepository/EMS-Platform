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
commits: [5ef7e08, 6dd9624, d7b0bd6, pending]
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

Третья bounded-подистория [`K4.3-setup-ldap-auth-handler.md`](K4.3-setup-ldap-auth-handler.md)
реализована 2026-08-30: response и network-error mapping проверки LDAP
вынесены из `handleTestLdapAuth`, добавлены focused tests, а complexity функции
снижена с `cx 13` до `cx 4`. Полные test, lint, web tsc и quality gates зелёные;
stage ожидает отдельного Conventional Commit.

Четвёртая bounded-подистория [`K4.4-eps-import-slug-builder.md`](../done/2026-08/K4.4-eps-import-slug-builder.md)
закрыта коммитом `8bad0d4` и оформлена ledger-коммитом `e68230a`: из
`makeEnglishSlug` вынесены canonical lookup, translation и slug sanitization
helpers, добавлены 5 focused tests. Публичный API и единственный consumer в
`eps-import-matcher.ts` не изменены. Полные test, lint, web tsc и quality gates
зелёные; quality baseline после stage показывает 23 F-grade files и 2339 code
smells в `apps/web/src`.

Пятое измерение после K4.4: максимальный реальный кандидат —
`WmsOperationWizardDialog` с `cx 42` / 178 строками. Bounded-подистория K4.5
вынесла submit orchestration/payload execution, снизив `handleSubmit` до
`cx 5` / 27 строк. Фокусированные тесты и все gates зелёные; закрыта коммитом
`669ddc3`, ledger оформлен коммитом `4a95456`.

Шестое измерение 2026-08-30: максимальный проверенный реальный кандидат —
[`getSystemSettings()`](../../apps/web/src/lib/system-settings-service.ts:29) с
`cx 32` и 65 строками. Bounded-подистория K4.6 вынесла pure config construction
и env/database fallback mapping в
[`system-settings-builder.ts`](../../apps/web/src/lib/system-settings-builder.ts),
добавла 4 focused tests и снизила service function до `cx 4` / 28 строк.
Targeted/full tests, lint, web tsc и quality зелёные; stage закрыта коммитом
`d7b0bd6`. Историческая docs-link проверка после stage выявила устаревшие
относительные ссылки в ранее закрытой K4.6 story; они не относятся к текущему
K4.7 source change.

Седьмое измерение 2026-08-30: после K4.6 максимальный числовой результат
checker — `WmsOperationWizardDialog` `cx 42`, но это presentation boundary.
Первый следующий verified business candidate — [`GET()`](../../apps/web/src/app/api/eps/approvals/route.ts:12)
с `cx 29` / 159 строками. Bounded-подистория создана в
[`K4.7-eps-approvals-get-query.md`](K4.7-eps-approvals-get-query.md): в текущем
stage вынесены только pure query parsing/filter/stat construction, добавлены
focused tests и сохранены GET/POST route contracts. Targeted tests, full tests,
web lint, web tsc и quality baseline зелёные; docs gate требует исправления
исторических K4.6 links перед закрытием stage.
