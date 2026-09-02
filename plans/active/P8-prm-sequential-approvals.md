---
id: P8
title: Добавить настраиваемое последовательное согласование PRM
status: active
phase: P
priority: P1
risk: high
skills: [database-schema-designer, senior-backend, senior-frontend, senior-security, senior-qa]
opened: 2026-09-02
closed: null
commits: []
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P8 — Добавить настраиваемое последовательное согласование PRM

## Problem

Текущее согласование PRM плоское: `PurchaseRequest` хранит один `reviewerId`,
`reviewedAt` и `resolutionComment` в
[`PurchaseRequest`](../../packages/database/prisma/schema.prisma:681), переход
`SUBMITTED → APPROVED/REJECTED` задан в
[`ALLOWED_TRANSITIONS`](../../apps/web/src/lib/prm-requests-service.ts:70), а
[`executeStatusTransition()`](../../apps/web/src/lib/prm-transition-handler.ts:45)
назначает решение одному actor. UI также предлагает единое действие через
[`PrmRequestReviewDialog`](../../apps/web/src/app/prm/page.tsx:383).

Заказчик подтвердил другой процесс: последовательные настраиваемые стадии должны
выбираться по сумме заявки и целевому складу. Текущая модель не может хранить
policy, порядок стадий, неизменяемый маршрут конкретной отправки, решения каждого
шага или корректный resubmit после редактирования. При этом задача ограничена
PRM и не должна превращаться в generic workflow engine.

## Scope

**Входит в scope:**

- PRM-specific модели политики согласования и упорядоченных стадий, привязанные к
  складу или fallback policy и диапазону суммы.
- Детерминированный resolver: активная policy выбирается по `targetWarehouseId`
  и `estimatedTotal`, с явным приоритетом warehouse-specific над fallback,
  запретом пересекающихся активных диапазонов одинаковой специфичности и fail
  closed при отсутствии/неоднозначности.
- При submit создавать versioned immutable approval snapshot для заявки: policy
  identity/version, сумма, валюта, склад и копии ordered stages/assignees.
- Последовательные решения: активна ровно одна стадия; approve открывает следующую,
  последняя переводит request в `APPROVED`; reject завершает попытку в `REJECTED`.
- Edit/resubmit semantics: rejected request возвращается инициатором в editable
  draft/revision, изменение суммы/склада/позиций инвалидирует старую попытку, а
  новый submit создаёт новую snapshot version с полной историей старой.
- PRM admin UI для CRUD/version activation policies/stages и request UI с
  timeline текущей/прошлых попыток и очередью «мои стадии».
- Интеграция stage deadlines со snapshot SLA из [P7](P7-prm-sla-aging-escalations.md).

**Не входит в scope:**

- Generic workflow/BPM engine, параллельные ветви, arbitrary conditions/scripts,
  quorum voting, ad-hoc stage insertion или cross-module approvals.
- Делегирование, замещение и отпускные правила; они явно отложены, если отдельное
  обязательное бизнес-требование не будет подтверждено до реализации.
- Изменение approved request после финального решения, supplier/RFQ/award или
  консолидация P9.
- Автоматическое согласование из-за отсутствия policy/assignee.

## Steps

1. Спроектировать PRM-only policy, policy stage, approval attempt snapshot и
   stage decision модели с versioning, constraints, indexes и миграцией.
2. Реализовать чистый deterministic resolver и validators диапазонов/порядка;
   задать fail-closed ошибки для no-match, overlap, inactive warehouse/assignee.
3. Перестроить submit как транзакцию создания snapshot attempt и активации первой
   стадии; сохранить совместимое верхнеуровневое состояние `SUBMITTED` до финала.
4. Заменить single-reviewer approve/reject на stage decision service с
   optimistic/concurrency guard, одним решением на stage и аудитом каждой смены.
5. Реализовать revision/resubmit: разрешённое редактирование отклонённой заявки,
   immutable history попыток, новая policy resolution и запрет мутации approved
   quantities.
6. Добавить scoped admin API/UI для политик и request UI timeline/queue, используя
   существующие UI primitives и permissions без универсального конструктора.
7. Интегрировать stage deadlines и эскалации P7 с snapshot каждой активной стадии.
8. Покрыть resolver, migrations, transitions, concurrency, auth, resubmit и UI
   исполняемыми тестами; выполнить полные gates и закрыть одним коммитом.

## Definition of Done

- [ ] Resolver для одной пары warehouse/amount всегда возвращает ровно одну
      активную policy version или явную ошибку; порядок specificity и границы
      диапазонов покрыты тестами, включая min/max equality.
- [ ] Пересекающиеся активные диапазоны одинаковой специфичности и policy без
      стадий/assignee нельзя активировать.
- [ ] Submit атомарно фиксирует immutable snapshot склада, суммы, валюты, policy
      version и ordered stages; последующие изменения конфигурации не меняют
      текущую попытку.
- [ ] Одновременно активна ровно одна стадия; только назначенный approver или
      разрешённый PRM admin может принять решение; double decision/concurrent
      approve не перескакивает стадии.
- [ ] Финальное approve переводит request в `APPROVED`; reject фиксирует stage,
      actor, timestamp, обязательный comment и переводит request в `REJECTED`.
- [ ] Edit/resubmit сохраняет старую attempt history, создаёт новую snapshot
      version и повторно разрешает policy по новой сумме/складу; approved request
      и approved quantities не редактируются.
- [ ] Делегирование отсутствует в schema/API/UI и не имитируется общим engine.
- [ ] Stage SLA использует snapshot semantics P7 и не пересчитывается задним числом.
- [ ] Каждый новый write-route покрыт success, validation, 401, 403 и safe 500;
      всё новое поведение имеет исполняемые тесты в том же коммите, проверенные на
      падение при регрессии по [`.agents/rules/testing.md`](../../.agents/rules/testing.md).
- [ ] Миграция проверена на чистой/заполненной БД; static security, coverage,
      quality baseline и все gates green без снижения порогов.
- [ ] Story закрыта одним Conventional Commit; зависит от [P7](P7-prm-sla-aging-escalations.md),
      предоставляет approval history для [P9](P9-prm-demand-consolidation.md) и
      [P10](P10-prm-procurement-analytics.md).

## Result
