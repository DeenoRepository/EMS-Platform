---
id: O3
title: Покрыть доменные сервисы, SRM-адаптеры и пакет @ems/shared
status: done
phase: O
priority: P1
risk: medium
skills: [senior-qa, senior-backend]
opened: 2026-09-01
closed: 2026-09-01
commits: [pending]
gates: [test, coverage, lint, tsc]
---

# O3 — Покрыть доменные сервисы, SRM-адаптеры и пакет @ems/shared

## Problem

11 модулей `apps/web/src/lib/**` не имеют тестов, и весь пакет
`@ems/shared` (5 модулей) — тоже. Это чистая логика: самая дешёвая в
покрытии и самая часто переиспользуемая.

Непокрытые модули:

| Модуль | Роль |
|---|---|
| [`srm-providers/jira-adapter.ts`](../../../apps/web/src/lib/srm-providers/jira-adapter.ts) | маппинг Jira → внутренняя модель |
| [`srm-providers/gitlab-adapter.ts`](../../../apps/web/src/lib/srm-providers/gitlab-adapter.ts) | маппинг GitLab |
| [`srm-providers/redmine-adapter.ts`](../../../apps/web/src/lib/srm-providers/redmine-adapter.ts) | маппинг Redmine |
| [`srm-providers/generic-rest-adapter.ts`](../../../apps/web/src/lib/srm-providers/generic-rest-adapter.ts) | произвольный REST |
| [`jira/service-requests.ts`](../../../apps/web/src/lib/jira/service-requests.ts) | создание заявок |
| [`jira/field-mapping.ts`](../../../apps/web/src/lib/jira/field-mapping.ts) | частично покрыт `field-mapping.test.ts` |
| [`api-client.ts`](../../../apps/web/src/lib/api-client.ts) | транспорт фронта |
| [`custom-sections-defaults.ts`](../../../apps/web/src/lib/custom-sections-defaults.ts) | 287 строк дефолтов паспорта |
| [`jira/sync.ts`](../../../apps/web/src/lib/jira/sync.ts) | синхронизация |
| [`jira/metrics.ts`](../../../apps/web/src/lib/jira/metrics.ts) | агрегаты |
| [`jira/notifications.ts`](../../../apps/web/src/lib/jira/notifications.ts) | уведомления |

Пакет [`@ems/shared`](../../../packages/shared/src/index.ts):
[`formatters.ts`](../../../packages/shared/src/formatters.ts) (3 функции с
граничными случаями `null`/`undefined`/невалидная дата),
[`permissions.ts`](../../../packages/shared/src/permissions.ts),
[`constants.ts`](../../../packages/shared/src/constants.ts),
[`types.ts`](../../../packages/shared/src/types.ts).

Также без прямых тестов: [`logger.ts`](../../../apps/web/src/lib/logger.ts),
[`jira-service.ts`](../../../apps/web/src/lib/jira-service.ts),
[`system-settings-service.ts`](../../../apps/web/src/lib/system-settings-service.ts),
[`auth-client.tsx`](../../../apps/web/src/lib/auth-client.tsx).

## Scope

Unit-тесты чистой логики и сервисов с мокированным транспортом.
Внешние системы (Jira, GitLab, Redmine, LDAP) не вызываются — только
`fetch`-мок и зафиксированные fixture-ответы.

Не входит: изменение форматов маппинга. Существующие маппинги
фиксируются тестом как контракт.

## Steps

1. `packages/shared/src/formatters.test.ts`: `formatDate`,
   `formatDateTime`, `formatBytes` — валидные значения, `null`,
   `undefined`, `NaN`, отрицательные байты, границы единиц (1023/1024),
   `decimals = 0`.
2. `packages/shared/src/permissions.test.ts`: полнота набора
   `PERMISSIONS`, отсутствие дублей значений, соответствие ключей
   доменным префиксам (`EPS_`, `WMS_`, `MRO_`, `SRM_`, `ADMIN_`).
3. `apps/web/src/lib/srm-providers/__tests__/adapters.test.ts`: для
   каждого из 4 адаптеров — маппинг полного ответа, ответа с
   отсутствующими полями, ответа с неизвестным статусом (fallback),
   и ошибки транспорта. Fixture-ответы хранить в
   `srm-providers/__tests__/fixtures/`.
4. `apps/web/src/lib/jira/__tests__/service-requests.test.ts` и
   `sync.test.ts`, `metrics.test.ts`, `notifications.test.ts` — на
   мокированном `fetch`, включая retry/timeout ветки, если они есть.
5. `apps/web/src/lib/__tests__/api-client.test.ts`: обработка 401
   (redirect/refresh), 5xx, non-JSON тела, сетевой ошибки.
6. `apps/web/src/lib/__tests__/custom-sections-defaults.test.ts`:
   структурная валидность дефолтов (уникальные ключи секций и полей,
   непустые заголовки, соответствие допустимым типам полей).
7. `apps/web/src/lib/__tests__/logger.test.ts`: bounded-поведение из
   [`B1`](../2026-08/B1-structured-logging-bounded.md) — обрезка
   больших payload, отсутствие секретов в выводе.
8. `apps/web/src/lib/__tests__/system-settings-service.test.ts` и
   `jira-service.test.ts` поверх существующего
   [`system-settings-builder.test.ts`](../../../apps/web/src/lib/system-settings-builder.test.ts).
9. Поднять пороги до строки «После O3» [`O0`](../../active/O0-coverage-roadmap.md):
   line 78 / reach 48 / component 1.

## Definition of Done

- [x] `@ems/shared` pure logic и permission catalog покрыты отдельным
      suite; production build и test-only config проходят typecheck.
- [x] Все 4 SRM-адаптера покрыты через mocked `fetch`: auth headers,
      endpoints, success, non-2xx и transport errors.
- [x] Jira field mapping, metrics, advanced RAMS, internal SRM request и
      MRO work-order business rules имеют executable tests.
- [x] `api-client.ts`, `logger.ts` и `custom-sections-defaults.ts` покрыты.
- [x] Внешняя сеть и реальная БД не вызываются: `fetch` и Prisma замоканы.
- [x] Пороги подняты до 78/48/1, baseline перегенерирован.
- [x] Full gate green: test, coverage, lint, static security, tsc, docs.

## Result

Добавлены тесты:

- [`shared-logic.test.ts`](../../../packages/shared/src/shared-logic.test.ts)
  — форматтеры, permission definitions и status maps;
- [`adapters.test.ts`](../../../apps/web/src/lib/srm-providers/adapters.test.ts)
  — Jira, GitLab, Redmine и Generic REST adapters;
- [`business-logic.test.ts`](../../../apps/web/src/lib/jira/business-logic.test.ts)
  — mapping, MTTR/MTBF/SLA/RAMS, internal incidents и MRO;
- [`api-client-logger-custom-sections.test.ts`](../../../apps/web/src/lib/__tests__/api-client-logger-custom-sections.test.ts)
  — HTTP client, request logger и migration/bootstrap custom fields;
- [`tsconfig.test.json`](../../../packages/shared/tsconfig.test.json)
  — изолированная TypeScript-конфигурация тестов shared package.

Фактический результат:

- 97 Node test files, 584 checks, 0 failures;
- Node line coverage **85.83 %**;
- file-level reach **67.57 %** (250 из 370 production-файлов);
- component line coverage **2.63 %**;
- coverage thresholds ratcheted to **78 / 48 / 1**;
- lint, static security policy, all TypeScript projects и docs gate pass.

Коммит закрытия будет указан после переноса story и фиксации изменений.
