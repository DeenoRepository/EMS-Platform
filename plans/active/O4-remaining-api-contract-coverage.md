---
id: O4
title: Довести контракт-тесты до 100% API-роутов и включить route-coverage gate
status: active
phase: O
priority: P2
risk: medium
skills: [senior-qa]
opened: 2026-09-01
closed: null
commits: []
gates: [test, coverage, lint, tsc]
---

# O4 — Довести контракт-тесты до 100% API-роутов и включить route-coverage gate

## Problem

После [`O1`](O1-security-route-coverage.md) и
[`O2`](O2-write-path-business-logic-coverage.md) остаются непокрытыми
read/CRUD-роуты, у которых нет прямого security- или write-риска, но
которые формируют контракт для фронта:

- [`dashboard/stats`](../../apps/web/src/app/api/dashboard/stats/route.ts)
- [`eps/history`](../../apps/web/src/app/api/eps/history/route.ts)
- [`eps/documents/[id]`](../../apps/web/src/app/api/eps/documents/[id]/route.ts)
- [`eps/equipment/[id]/audit`](../../apps/web/src/app/api/eps/equipment/[id]/audit/route.ts)
- [`eps/equipment/[id]/documents`](../../apps/web/src/app/api/eps/equipment/[id]/documents/route.ts)
- [`eps/equipment/[id]/photos`](../../apps/web/src/app/api/eps/equipment/[id]/photos/route.ts)
- [`eps/import/template`](../../apps/web/src/app/api/eps/import/template/route.ts)
- [`eps/reports/templates`](../../apps/web/src/app/api/eps/reports/templates/route.ts) и [`report template by id`](../../apps/web/src/app/api/eps/reports/templates/[id]/route.ts)
- [`feedback`](../../apps/web/src/app/api/feedback/route.ts), [`feedback by id`](../../apps/web/src/app/api/feedback/[id]/route.ts), [`feedback comments`](../../apps/web/src/app/api/feedback/[id]/comments/route.ts)
- [`srm/integrations`](../../apps/web/src/app/api/srm/integrations/route.ts), [`integration by id`](../../apps/web/src/app/api/srm/integrations/[id]/route.ts), [`integration test`](../../apps/web/src/app/api/srm/integrations/[id]/test/route.ts)
- [`srm/issues/[id]`](../../apps/web/src/app/api/srm/issues/[id]/route.ts)
- [`srm/mapping`](../../apps/web/src/app/api/srm/mapping/route.ts), [`mapping/test`](../../apps/web/src/app/api/srm/mapping/test/route.ts)

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
5. Добавить вызов скрипта в [`test-runner.mjs`](../../scripts/test-runner.mjs)
   или в `pnpm lint` и описать его в [`scripts/README.md`](../../scripts/README.md).
6. Поднять пороги до строки «После O4» [`O0`](O0-coverage-roadmap.md):
   line 80 / reach 62 / component 1.

## Definition of Done

- [ ] `node scripts/check-route-test-coverage.mjs` возвращает 0 при
      пустой разнице и 1 при добавлении роута без теста (проверено вручную).
- [ ] Все 85 роутов присутствуют в тестах либо в обоснованном allowlist.
- [ ] Upload-роуты покрыты негативными кейсами размера и MIME.
- [ ] Скрипт задокументирован в `scripts/README.md`.
- [ ] Пороги подняты до 80/62/1, baseline перегенерирован.
- [ ] Full gate green: test, coverage, lint, tsc.

## Result

Заполняется при закрытии.
