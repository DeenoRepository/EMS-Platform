---
id: P7
title: Добавить сроки, SLA, aging и эскалации PRM
status: active
phase: P
priority: P1
risk: high
skills: [database-schema-designer, senior-backend, senior-frontend, senior-qa]
opened: 2026-09-02
closed: null
commits: []
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P7 — Добавить сроки, SLA, aging и эскалации PRM

## Problem

`PurchaseRequest` уже имеет бизнес-срок `requiredByDate` в
[`PurchaseRequest`](../../packages/database/prisma/schema.prisma:681), и create/update
API принимают его в [`createSchema`](../../apps/web/src/app/api/prm/requests/route.ts:109)
и [`updateSchema`](../../apps/web/src/app/api/prm/requests/[id]/route.ts:78). Но
реестр [`PrmRegistryContent()`](../../apps/web/src/app/prm/page.tsx:36), таблица
[`PrmRequestTableView()`](../../apps/web/src/components/prm/PrmRequestTableView.tsx:41)
и карточка [`PrmRequestDetailsDialog()`](../../apps/web/src/components/prm/PrmRequestDetailsDialog.tsx:22)
не показывают required date, возраст, SLA deadline или overdue state. Stats в
[`buildPurchaseRequestStats()`](../../apps/web/src/app/api/prm/requests/get-query.ts:44)
считают только статусы и персональные очереди.

В проекте есть локальный пример overdue-фильтрации MRO в
[`GET()`](../../apps/web/src/app/api/mro/schedules/route.ts:11) и пример SLA
уведомлений SRM в
[`notifySrmIncident()`](../../apps/web/src/lib/jira/notifications.ts:6), но PRM не
имеет собственной политики сроков, дедлайнов этапов, дедупликации эскалаций или
очередей просрочки.

## Scope

**Входит в scope:**

- Ввести PRM-specific конфигурацию SLA для этапов согласования и исполнения с
  понятными defaults; не использовать generic workflow/SLA engine.
- На submit/approval зафиксировать immutable deadline текущего этапа, чтобы
  последующее изменение policy не переписывало историю активной заявки.
- Определить aging как календарную разницу от входа в текущий этап, а overdue —
  относительно snapshot deadline; `requiredByDate` показывать отдельно как
  бизнес-срок потребности.
- Добавить очереди `due soon`, `overdue approval`, `overdue fulfillment` и
  фильтры по складу/приоритету/статусу с существующим scoped access.
- Реализовать повторяемый escalation runner в существующем приложении/скриптах,
  с идемпотентной дедупликацией уведомлений по заявке, этапу и порогу.
- Показать due date, SLA deadline, aging и severity в реестре/карточке и добавить
  уведомления ответственным и PRM managers.

**Не входит в scope:**

- Отдельный scheduler service, message broker или внешняя система уведомлений.
- Business-calendar/праздники, pause/resume clocks, delegation или on-call rota.
- Автоматическое изменение статуса, отмена или закрытие просроченной заявки.
- Многошаговая маршрутизация P8; P7 сначала покрывает текущий approval stage, а
  P8 обязан переиспользовать stage snapshot semantics.

## Steps

1. Спроектировать PRM SLA policy/config fields и snapshot deadline fields,
   версионированную миграцию и deterministic pure calculators для due/aging.
2. Зафиксировать timestamps входа в approval/fulfillment при существующих
   переходах и поставках; не пересчитывать прошлые deadlines при смене config.
3. Расширить list query/where model серверными queue-фильтрами и агрегированными
   scoped counts без загрузки всей таблицы в память.
4. Реализовать escalation service/runner с порогами due-soon/overdue/repeat,
   дедупликацией и адресатами: текущий ответственный, МОЛ и PRM manager согласно
   этапу и scope.
5. Добавить очередь и визуальные индикаторы в PRM реестр/карточку, используя
   semantic theme tokens и shared UI primitives.
6. Добавить тесты с фиксированными часами для границ deadline, смены даты,
   повторного runner, scoping и notification recipients.
7. Документировать команду запуска в пределах кода/скрипта story, выполнить
   migration/security/quality gates и закрыть одним коммитом.

## Definition of Done

- [ ] Для каждой submitted/approved active заявки определены `stageEnteredAt`,
      snapshot SLA target/deadline и вычисляемый non-negative aging.
- [ ] Изменение конфигурации SLA влияет только на последующие входы в этап и не
      переписывает deadline уже активной стадии.
- [ ] `requiredByDate`, SLA deadline и overdue не смешиваются: UI и API возвращают
      их отдельными полями с документированной семантикой.
- [ ] Очереди due soon, overdue approval и overdue fulfillment считаются на
      сервере, поддерживают warehouse scoping и не раскрывают чужие заявки.
- [ ] Escalation runner повторяем: один и тот же threshold создаёт не более одного
      уведомления на request/stage/threshold; следующий разрешённый repeat
      создаётся только по политике.
- [ ] Просрочка не меняет status и не мутирует quantities; уведомления содержат
      canonical ссылку из [P3](P3-fix-prm-notification-navigation.md).
- [ ] Новое и изменённое поведение покрыто исполняемыми тестами в том же коммите,
      включая fixed-time boundary tests и route axes; тесты проверены на падение
      при регрессии по [`.agents/rules/testing.md`](../../.agents/rules/testing.md).
- [ ] Миграция проверена на чистой/заполненной БД, `db push` не используется;
      пороги покрытия и quality baseline не понижены; full gate green.
- [ ] Story закрыта одним Conventional Commit; зависит от [P3](P3-fix-prm-notification-navigation.md),
      предоставляет deadline/history data для [P8](P8-prm-sequential-approvals.md) и
      KPI для [P10](P10-prm-procurement-analytics.md).

## Result
