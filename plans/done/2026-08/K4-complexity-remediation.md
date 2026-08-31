---
id: K4
title: Снизить реальную цикломатическую сложность приоритетных функций
status: done
phase: K
priority: P2
risk: medium
skills: [senior-frontend, senior-backend, zero-hallucination-coder]
opened: 2026-08-30
closed: 2026-08-30
commits: [5ef7e08, 6dd9624, d7b0bd6, f54b0c8, a84ccab, dc36a68, 92ede6f]
gates: [test, lint, tsc, check:quality, check:docs]
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

- [x] Для каждой подистории целевая функция имеет complexity ≤ 10 либо
  документированное обоснование исключения.
- [x] Поведение покрыто тестами до/после рефакторинга.
- [x] Нет новых F-grade regressions; lint/tsc/test gates зелёные.
- [x] Изменения не смешивают security, UI и unrelated refactoring.

## Result

Шаг 1 выполнен 2026-08-30: quality checker повторно измерил кандидатов,
после чего границы функций проверены чтением исходников. Максимальная реальная
цикломатическая сложность среди проверенных приоритетных кандидатов — `loadData`
в [`Sidebar.tsx`](../../../apps/web/src/components/layout/Sidebar.tsx): `cx 46`,
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

Четвёртая bounded-подистория [`K4.4-eps-import-slug-builder.md`](K4.4-eps-import-slug-builder.md)
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
[`getSystemSettings()`](../../../apps/web/src/lib/system-settings-service.ts:29) с
`cx 32` и 65 строками. Bounded-подистория K4.6 вынесла pure config construction
и env/database fallback mapping в
[`system-settings-builder.ts`](../../../apps/web/src/lib/system-settings-builder.ts),
добавла 4 focused tests и снизила service function до `cx 4` / 28 строк.
Targeted/full tests, lint, web tsc и quality зелёные; stage закрыта коммитом
`d7b0bd6`. Историческая docs-link проверка после stage выявила устаревшие
относительные ссылки в ранее закрытой K4.6 story; они не относятся к текущему
K4.7 source change.

Седьмое измерение 2026-08-30: после K4.6 максимальный числовой результат
checker — `WmsOperationWizardDialog` `cx 42`, но это presentation boundary.
Первый следующий verified business candidate — [`GET()`](../../../apps/web/src/app/api/eps/approvals/route.ts:12)
с `cx 29` / 159 строками. Bounded-подистория создана в
[`K4.7-eps-approvals-get-query.md`](K4.7-eps-approvals-get-query.md): в текущем
stage вынесены только pure query parsing/filter/stat construction, добавлены
focused tests и сохранены GET/POST route contracts. Targeted tests, full tests,
web lint, web tsc, quality baseline и docs link check зелёные; stage закрыта
коммитом `7615f8e`.

Восьмое измерение 2026-08-30: после закрытия K4.7 числовой максимум checker —
`WmsOperationWizardDialog` с `cx 42`, но это presentation boundary. Следующий
проверенный business candidate — [`GET()`](../../../apps/web/src/app/api/eps/equipment/route.ts:10)
с `cx 24` / 145 строками: query parsing, Prisma filter, status aggregation и
response mapping находятся в одном route handler. Для следующей bounded stage
выбран только GET equipment query/status construction; POST, UI и прочие K4
candidates не входят в scope.

Девятое измерение после K4.10: quality checker подтвердил следующим verified
business candidate [`PATCH()`](../../../apps/web/src/app/api/srm/issues/[id]/route.ts:87)
с `cx 26`. Проверка чтением исходника подтвердила, что complexity сосредоточена в
partial update и derived resolved/downtime model; численно более высокий
`handleOpenDetails` в SRM является трёхстрочным state setter и исключён как
presentation-only false positive.

Для него создана bounded-подистория
[`K4.11-srm-issue-patch-update-model.md`](K4.11-srm-issue-patch-update-model.md):
в текущем stage вынесены только pure update-field/resolution calculations,
добавлены focused tests, а Prisma side effects, RBAC, rate limiting, audit и
response contract остаются в route.

Десятое измерение после закрытия K4.13: verified business candidate
[`buildTransferWhereInput()`](../../../apps/web/src/lib/wms-transfers-service.ts:46)
имел `cx 26` / 73 строки. Для K4.14 выделена только декомпозиция mode/warehouse
scope и search filter в [`wms-transfer-where-model.ts`](../../../apps/web/src/lib/wms-transfer-where-model.ts:1).
Публичный consumer в [`GET()`](../../../apps/web/src/app/api/wms/transfers/route.ts:20),
Prisma where contract и POST не изменялись; focused tests добавлены в
[`wms-transfers.test.ts`](../../../apps/web/src/lib/__tests__/wms-transfers.test.ts:1).
После stage quality checker показывает `buildTransferWhereInput()` `cx 1`,
`buildTransferWhereModel()` `cx 3`, `applyModeScope()` `cx 10`; targeted/full tests,
lint, web tsc, quality baseline и docs link check зелёные. Stage committed as
`92ede6f`; story remains active until its closeout commit.

## K4 parent closeout — 2026-08-30

All bounded K4 stages are complete and indexed: K4.1, K4.1.1, and K4.2–K4.14.
The remaining highest measured functions are not unaddressed K4 business candidates:
`WmsOperationWizardDialog` (`cx 42`) is a presentation/render boundary;
`handleOpenDetails` in SRM (`cx 35`) is a state/presentation boundary; and
`handleRequestSort` in EPS documents (`cx 34`) is a route/page presentation boundary.
No further K4 work is invented from numeric checker output.

Closeout verification from HEAD `ef54669`:

- Quality baseline report passed: `apps/web/src` average `84.2`, 22 F-grade files,
  2347 smells, 24 SOLID violations; `packages` average `94.1`, zero F-grade files,
  74 smells, zero SOLID violations.
- Full test gate passed: 187 tests passed, 0 failed.
- Full lint gate passed: `pnpm lint`.
- Web TypeScript gate passed: `pnpm --filter @ems/web exec tsc --noEmit`.
- Documentation links gate passed: `pnpm check:docs`.
- Plans index regenerated successfully.

The generated quality baseline was updated with the current measured values. K4 is
closed without changing implementation behavior, security, UI, K6, or unrelated work.
