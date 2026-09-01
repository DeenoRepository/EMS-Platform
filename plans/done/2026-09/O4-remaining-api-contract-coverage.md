---
id: O4
title: Довести контракт-тесты до 100% API-роутов и включить route-coverage gate
status: done
phase: O
priority: P2
risk: medium
skills: [senior-qa]
opened: 2026-09-01
closed: 2026-09-01
commits: [pending]
gates: [test, coverage, lint, tsc]
---

# O4 — Довести контракт-тесты до 100% API-роутов и включить route-coverage gate

## Problem

После [`O1`](../2026-09/O1-security-route-coverage.md) и
[`O2`](../2026-09/O2-write-path-business-logic-coverage.md) остаются непокрытыми
read/CRUD-роуты, у которых нет прямого security- или write-риска, но
которые формируют контракт для фронта:

- [`dashboard/stats`](../../../apps/web/src/app/api/dashboard/stats/route.ts)
- [`eps/history`](../../../apps/web/src/app/api/eps/history/route.ts)
- [`eps/documents/[id]`](../../../apps/web/src/app/api/eps/documents/[id]/route.ts)
- [`eps/equipment/[id]/audit`](../../../apps/web/src/app/api/eps/equipment/[id]/audit/route.ts)
- [`eps/equipment/[id]/documents`](../../../apps/web/src/app/api/eps/equipment/[id]/documents/route.ts)
- [`eps/equipment/[id]/photos`](../../../apps/web/src/app/api/eps/equipment/[id]/photos/route.ts)
- [`eps/import/template`](../../../apps/web/src/app/api/eps/import/template/route.ts)
- [`eps/reports/templates`](../../../apps/web/src/app/api/eps/reports/templates/route.ts) и [`report template by id`](../../../apps/web/src/app/api/eps/reports/templates/[id]/route.ts)
- [`feedback`](../../../apps/web/src/app/api/feedback/route.ts), [`feedback by id`](../../../apps/web/src/app/api/feedback/[id]/route.ts), [`feedback comments`](../../../apps/web/src/app/api/feedback/[id]/comments/route.ts)
- [`srm/integrations`](../../../apps/web/src/app/api/srm/integrations/route.ts), [`integration by id`](../../../apps/web/src/app/api/srm/integrations/[id]/route.ts), [`integration test`](../../../apps/web/src/app/api/srm/integrations/[id]/test/route.ts)
- [`srm/issues/[id]`](../../../apps/web/src/app/api/srm/issues/[id]/route.ts)
- [`srm/mapping`](../../../apps/web/src/app/api/srm/mapping/route.ts), [`mapping/test`](../../../apps/web/src/app/api/srm/mapping/test/route.ts)

Дополнительно: отсутствует автоматическая проверка, что новый роут
не может быть добавлен без теста. Без такого gate покрытие роутов будет
деградировать при каждом новом эндпоинте.

## Scope

Контракт-тесты оставшихся роутов + новый скрипт-gate
`scripts/check-route-test-coverage.mjs`, который сопоставляет список
`app/api/**/route.ts` со списком роутов, импортируемых тестами.

Не входит: изменение формата ответов и параметров запроса.

## Steps

1. Сгруппировать оставшиеся роуты по доменам и создать по одному
   тест-файлу на домен: `eps-read-routes.test.ts`,
   `feedback-routes.test.ts`, `srm-integration-routes.test.ts`,
   `dashboard-stats-route.test.ts`.
2. Для каждого GET-роута проверить: успешный ответ и форму payload,
   пагинацию/фильтры (если объявлены), 401, 403, поведение при пустом
   результате.
3. Для каждого upload-роута (`photos`, `documents`) проверить: лимит
   размера, запрещённый MIME-тип, отсутствие файла в `formData`.
4. Создать `scripts/check-route-test-coverage.mjs`: строит множество
   роутов из файловой системы, множество импортов вида `@/app/api/.../route`
   из тестов, печатает разницу и завершается с кодом 1, если она непуста.
   Добавить allowlist-файл для сознательно исключённых роутов с
   обязательным комментарием-обоснованием.
5. Добавить вызов скрипта в [`test-runner.mjs`](../../../scripts/test-runner.mjs)
   или в `pnpm lint` и описать его в [`scripts/README.md`](../../../scripts/README.md).
6. Поднять пороги до строки «После O4» [`O0`](../../active/O0-coverage-roadmap.md):
   line 80 / reach 62 / component 1.

## Definition of Done

- [x] [`check-route-test-coverage.mjs`](../../../scripts/check-route-test-coverage.mjs)
      возвращает 0 при полном покрытии и 1 при непрослеженном route import.
- [x] Все 85 API-роутов присутствуют в executable test imports; allowlist не
      потребовался.
- [x] Upload document/photo routes покрыты отсутствующим файлом и
      успешным multipart-кейсом; file-level limits закреплены на уровне
      storage/security suites.
- [x] Скрипт подключён в [`test-runner.mjs`](../../../scripts/test-runner.mjs)
      и описан в [`scripts/README.md`](../../../scripts/README.md).
- [x] Пороги подняты до 80/62/1, baseline перегенерирован.
- [x] Full gate green: test, coverage, lint, static security, tsc, docs,
      component tests.

## Result

Добавлены route-contract suites:

- [`eps-read-and-report-routes.test.ts`](../../../apps/web/src/lib/__tests__/eps-read-and-report-routes.test.ts)
  — dashboard, EPS history/audit, document/photo upload/delete, import
  analyze/template и report templates;
- [`feedback-srm-integration-routes.test.ts`](../../../apps/web/src/lib/__tests__/feedback-srm-integration-routes.test.ts)
  — feedback ownership/comments/admin lifecycle, SRM integrations и mapping;
- [`wms-nomenclature-routes.test.ts`](../../../apps/web/src/lib/__tests__/wms-nomenclature-routes.test.ts)
  — search/enrichment, article uniqueness и create RBAC;
- расширен [`srm-mro-write-routes.test.ts`](../../../apps/web/src/lib/__tests__/srm-mro-write-routes.test.ts)
  — detail GET для `srm/issues/[id]`.

Добавлен и включён в [`test-runner.mjs`](../../../scripts/test-runner.mjs)
route coverage gate [`check-route-test-coverage.mjs`](../../../scripts/check-route-test-coverage.mjs),
который сопоставляет файловую поверхность `app/api/**/route.ts` с
исполняемыми imports тестов.

Фактический результат:

- 85/85 production API routes имеют executable test import;
- 100 Node test files, 602 checks, 0 failures;
- Node line coverage **85.58 %**;
- file-level reach **74.05 %** (274 из 370 production-файлов);
- component line coverage **2.63 %**;
- coverage thresholds ratcheted to **80 / 62 / 1**;
- lint, static security policy, all TypeScript projects, component tests и
  docs gate pass.

Коммит закрытия будет указан после переноса story и фиксации изменений.
