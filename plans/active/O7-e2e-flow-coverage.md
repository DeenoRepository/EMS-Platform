---
id: O7
title: Расширить Playwright E2E до всех критических сквозных потоков
status: active
phase: O
priority: P2
risk: medium
skills: [playwright-pro, senior-qa]
opened: 2026-09-01
closed: null
commits: [be43dfc, af7c49f, 1feebb9, d808e00]
gates: [test, lint, tsc]
---

# O7 — Расширить Playwright E2E до всех критических сквозных потоков

## Problem

В [`apps/web/e2e`](../../apps/web/e2e) пять spec-файлов:
`login.spec.ts`, `module-access.spec.ts`, `equipment-create.spec.ts`,
`eps-approval.spec.ts`, `wms-transfer.spec.ts`
(введены в [`L4`](../done/2026-08/L4-e2e-smoke-coverage.md) и
[`M5`](../done/2026-08/M5-e2e-in-ci.md)).

Не покрыты сквозные потоки, которые проходят через несколько модулей и
поэтому не ловятся ни unit-, ни component-тестами:

| Поток | Пересекаемые модули |
|---|---|
| Приёмка → размещение → выдача ТМЦ | WMS stock, zones, operations |
| Инвентаризация с расхождением | WMS inventories, stock |
| Импорт оборудования из файла | EPS import, equipment, audit |
| План ТО → выполнение → история | MRO plans, schedules, history |
| Инцидент SRM → наряд MRO | SRM issues, MRO |
| Обратная связь → обработка админом | feedback, admin |
| Настройка интеграции → тест подключения | admin settings, SRM |
| Восстановление после падения БД | system health, maintenance |

Каждая из 27 страниц (`app/**/page.tsx`) сейчас не имеет ни component-,
ни E2E-теста рендера — регрессия «страница падает при открытии» не
детектируется.

## Scope

Playwright specs на изолированной тестовой БД (см.
[`K7`](../done/2026-08/K7-test-db-isolation.md)) + smoke-обход всех
страниц.

Не входит: тестирование против реальных Jira/GitLab/Redmine — внешние
провайдеры заменяются локальным стабом
[`docker/jira/server.ts`](../../docker/jira/server.ts) или
route-interception Playwright.

## Steps

1. Ввести Page Object Model в `apps/web/e2e/pages/` для повторно
   используемых экранов (login, sidebar, data table, wizard) — без POM
   specs расползутся по селекторам.
2. Ввести auth-fixture с сохранением `storageState` по ролям
   (admin, storekeeper, viewer), чтобы не логиниться в каждом тесте.
3. Создать `wms-stock-lifecycle.spec.ts`: приёмка → размещение → выдача,
   с проверкой изменения остатка на UI после каждого шага.
4. Создать `wms-inventory.spec.ts`: инвентаризация с расхождением и
   его фиксацией.
5. Создать `eps-import.spec.ts`: загрузка файла, предпросмотр,
   выполнение импорта, появление записей в реестре.
6. Создать `mro-lifecycle.spec.ts`: создание плана, выполнение работ,
   запись в истории.
7. Создать `srm-to-mro.spec.ts`: инцидент → создание наряда MRO.
8. Создать `feedback-flow.spec.ts` и `admin-integration-settings.spec.ts`.
9. Создать `pages-smoke.spec.ts`: параметризованный обход всех 27
   маршрутов из `app/**/page.tsx` под ролью admin — ожидание HTTP 200,
   отсутствия `ErrorBoundary`-fallback и отсутствия ошибок в
   `console.error`.
10. Стабилизация: запретить `waitForTimeout`, использовать
    web-first assertions; включить `retries: 1` только в CI;
    прогнать набор 3 раза подряд и убедиться в отсутствии flaky.
11. Обновить CI-workflow, чтобы новые specs входили в обязательный gate,
    и приложить `playwright-report` как артефакт.
12. Поднять пороги до строки «После O7» [`O0`](O0-coverage-roadmap.md):
    line 82 / reach 65 / component 25.

## Definition of Done

- [x] 8 новых spec-файлов существуют и регистрируются Playwright.
- [ ] `pages-smoke.spec.ts` обходит все 27 страниц без ошибок консоли.
- [x] Введены POM и role-based fixtures для admin/guest-сессий.
- [x] В коде specs нет `page.waitForTimeout`.
- [ ] Три последовательных прогона полного набора дают 0 flaky.
- [x] CI публикует `playwright-report` как артефакт.
- [ ] Пороги подняты до 82/65/25, baseline перегенерирован.
- [ ] Full gate green: test, lint, tsc, Playwright.

## Result

Добавлены POM-объекты в [`apps/web/e2e/pages/`](../../apps/web/e2e/pages), role-based fixture [`apps/web/e2e/fixtures.ts`](../../apps/web/e2e/fixtures.ts), расширенный smoke обход страниц и новые smoke-проверки WMS, EPS import, MRO, SRM→MRO, feedback и admin settings. Playwright discovery подтверждает 52 теста в 14 spec-файлах; `pnpm --filter @ems/web lint`, TypeScript check и documentation links проходят. Полный Playwright прогон требует доступной PostgreSQL/Chromium среды и ещё не выполнен в этой рабочей сессии.
