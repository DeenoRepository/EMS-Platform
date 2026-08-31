---
id: L1
title: Подключить валидацию окружения к рантайму приложения
status: active
phase: L
priority: P0
risk: medium
skills: [senior-security, senior-backend, zero-hallucination-coder]
opened: 2026-08-31
closed: null
commits: []
gates: [test, lint, tsc, build, check:quality, check:docs]
---

# L1 — Подключить валидацию окружения к рантайму приложения

## Problem

[`env-validate.ts`](../../apps/web/src/lib/env-validate.ts:118) заканчивается
вызовом `validateEnv()` «на импорте», рассчитанным на побочный эффект при
загрузке модуля. Но **ни один продакшен-модуль этот файл не импортирует**:
единственные ссылки в репозитории — сам файл и
[`api-security.test.ts`](../../apps/web/src/lib/__tests__/api-security.test.ts:6),
который вызывает `validateEnv(true)` напрямую. Файла `instrumentation.ts` в
приложении нет, в [`next.config.mjs`](../../apps/web/next.config.mjs) хука тоже
нет.

Следствие: защита от слабых и дефолтных секретов
(`DANGEROUS_DEFAULTS`, минимальная длина `JWT_SECRET` 32 символа) написана,
покрыта тестами и **никогда не выполняется в бою**. Тесты зелёные, потому что
проверяют функцию, а не факт её вызова.

Отсутствие `JWT_SECRET` приложение всё же поймает — в
[`jwt.ts:7`](../../packages/auth/src/jwt.ts:7). А вот заданный, но слабый или
дефолтный секрет (`change_me`, `secret`, короткая строка) пройдёт молча. Это
рабочий сценарий: `.env.production.example` содержит плейсхолдер
`GENERATE_RANDOM_SECRET_KEY_MINIMUM_32_CHARACTERS_HERE`, который при невнимательном
деплое остаётся как есть — и не будет отвергнут.

Выявлено инспекцией
[`2026-08-31-inspection.md`](../../docs/quality/inspections/2026-08-31-inspection.md).

## Scope

**Изменяется:** добавляется точка входа, из которой `validateEnv()` реально
вызывается при старте сервера, и тест, фиксирующий сам факт подключения.

**Не изменяется:**
- Логика валидации в `env-validate.ts` — правила, список `DANGEROUS_DEFAULTS`
  и пороги остаются прежними.
- Поведение при незавершённой установке: ранний выход при отсутствии
  `.installed` ([`env-validate.ts:88`](../../apps/web/src/lib/env-validate.ts:88))
  обязан сохраниться, иначе сломается мастер первичной настройки.
- Пропуск валидации на этапе сборки
  ([`env-validate.ts:72`](../../apps/web/src/lib/env-validate.ts:72)) — иначе
  упадёт `pnpm build` в CI, где боевых секретов нет.
- Публичные API-контракты, схема БД, UI.

## Steps

1. Создать `apps/web/src/instrumentation.ts` с `register()`, который
   импортирует `@/lib/env-validate` **только** при
   `process.env.NEXT_RUNTIME === 'nodejs'`. Это обязательное условие:
   `validateEnv` использует `fs` и `path`
   ([`env-validate.ts:67`](../../apps/web/src/lib/env-validate.ts:67)) и в edge-рантайме
   упадёт. По той же причине его нельзя импортировать из
   [`middleware.ts`](../../apps/web/src/middleware.ts).
2. Проверить, что для установленной версии Next.js
   (`next` в [`apps/web/package.json`](../../apps/web/package.json)) файл
   `instrumentation.ts` подхватывается без флага `experimental.instrumentationHook`;
   если версия требует флаг — добавить его в `next.config.mjs`. Не полагаться
   на память: свериться с документацией установленной версии.
3. Убедиться, что сообщение об ошибке при падении попадает в лог контейнера и
   приводит к остановке процесса, а не к «тихому» старту с невалидной конфигурацией.
4. Добавить тест, проверяющий, что точка входа существует и импортирует
   валидатор под nodejs-рантаймом (по аналогии с проверкой исходника в
   [`api-security.test.ts:159`](../../apps/web/src/lib/__tests__/api-security.test.ts:159)).
   Это защищает именно от повторной регрессии «код есть, вызова нет».
5. Проверить вручную: `NODE_ENV=production` + `.installed` + `JWT_SECRET=change_me`
   → приложение обязано отказаться стартовать.

## Definition of Done

- [ ] `validateEnv()` фактически выполняется при старте сервера в production.
- [ ] Старт с `JWT_SECRET` из `DANGEROUS_DEFAULTS` или короче 32 символов
      завершается ошибкой (проверено вручную).
- [ ] Мастер первичной установки (без `.installed`) по-прежнему запускается.
- [ ] `pnpm build` не падает из-за валидации.
- [ ] Есть тест, падающий при удалении точки входа.
- [ ] Полный набор гейтов зелёный: см. `gates:` во front-matter.

## Result

Заполняется при закрытии story.
