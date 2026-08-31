---
id: L2
title: Ввести версионированные миграции БД вместо db push
status: done
phase: L
priority: P0
risk: high
skills: [database-schema-designer, senior-backend, zero-hallucination-coder]
opened: 2026-08-31
closed: 2026-08-31
commits: ["feat(database): ввести версионированные миграции Prisma вместо db push"]
gates: [test, lint, tsc, build, check:quality, check:docs]
---

# L2 — Ввести версионированные миграции БД вместо db push

## Problem

Каталога `packages/database/prisma/migrations/` не существует — в
[`packages/database/prisma/`](../../../packages/database/prisma/) лежит только
`schema.prisma`. При этом:

- [`package.json:22`](../../../package.json:22) объявляет
  `db:migrate:deploy` → `prisma migrate deploy`, которому **нечего применять**:
  без каталога миграций команда не создаст схему.
- Все реальные пути установки применяют схему через `db push --accept-data-loss`:
  [`setup/execute/route.ts:184`](../../../apps/web/src/app/api/setup/execute/route.ts:184),
  [`baremetal-install.sh:72`](../../../scripts/baremetal-install.sh:72),
  [`baremetal-install.ps1:42`](../../../scripts/baremetal-install.ps1:42),
  [`BAREMETAL_OFFLINE_DEPLOYMENT.md:200`](../../../docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md:200).

Для **первичной** установки на пустую БД это работает и данным не угрожает.
Риск возникает при **обновлении версии на работающей базе**: `db push`
приводит схему к целевому виду без плана и истории, а `--accept-data-loss`
явно разрешает деструктивные операции. Переименование поля выглядит для
`db push` как «удалить старое + создать новое» — данные столбца теряются
молча. Отката нет, так как нет зафиксированного шага, который можно
откатить.

Выявлено инспекцией
[`2026-08-31-inspection.md`](../../../docs/quality/inspections/2026-08-31-inspection.md).

## Scope

**Изменяется:** появляется baseline-миграция, отражающая текущую схему, и
путь обновления существующей инсталляции через `migrate deploy`.

**Не изменяется:**
- Содержимое `schema.prisma` — baseline обязан описывать схему **как есть**,
  без «попутных улучшений». Любое изменение модели данных — отдельная story.
- Сценарий первичной установки через мастер: он должен продолжать работать
  для пользователя без изменений в UI.
- Данные существующих инсталляций.

## Steps

1. Сгенерировать baseline-миграцию из текущей схемы
   (`prisma migrate diff` от пустой БД в SQL-файл первой миграции).
   Убедиться, что применение baseline к пустой БД даёт схему, идентичную
   результату текущего `db push`.
2. Задокументировать процедуру baseline для **уже развёрнутых** инсталляций:
   существующую боевую БД нельзя мигрировать «с нуля», её нужно пометить как
   находящуюся на baseline (`migrate resolve --applied`), иначе Prisma
   попытается применить создание уже существующих таблиц.
3. Перевести инсталляторы и путь обновления на `migrate deploy`. `db push`
   допустим только для локальной разработки; из production-путей
   `--accept-data-loss` убрать.
4. Отдельно решить судьбу
   [`setup/execute/route.ts:184`](../../../apps/web/src/app/api/setup/execute/route.ts:184):
   `execSync` с `npx` внутри HTTP-обработчика зависит от наличия сети и
   `npx` в проде. Как минимум — вызывать локальный бинарь Prisma, не `npx`.
5. Проверить оба сценария на одноразовой БД: (а) чистая установка,
   (б) обновление инсталляции, развёрнутой предыдущей версией.
6. Обновить [`PRODUCTION_DEPLOYMENT.md`](../../../docs/operations/PRODUCTION_DEPLOYMENT.md)
   и [`BAREMETAL_OFFLINE_DEPLOYMENT.md`](../../../docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md):
   описать шаг миграции и обязательный бэкап перед ним.

## Definition of Done

- [x] `packages/database/prisma/migrations/` содержит baseline, применение
      которого к пустой БД воспроизводит текущую схему.
- [x] `pnpm db:migrate:deploy` создаёт рабочую схему с нуля.
- [x] Ни один production-путь установки/обновления не использует
      `--accept-data-loss`.
- [x] Описана процедура перевода уже работающей БД на baseline.
- [x] Оба сценария (чистая установка и обновление) проверены на реальной БД,
      а не только на схеме.
- [x] Полный набор гейтов зелёный: см. `gates:` во front-matter.

## Result

Создана baseline-миграция
[`packages/database/prisma/migrations/20260831030000_init/migration.sql`](../../../packages/database/prisma/migrations/20260831030000_init/migration.sql)
через `prisma migrate diff --from-empty --to-schema-datamodel`, плюс
обязательный [`migration_lock.toml`](../../../packages/database/prisma/migrations/migration_lock.toml).

Проверено на реальном локальном PostgreSQL 18 (не только на бумаге):
- `prisma migrate deploy` на пустой БД создаёт полную схему; повторный
  `prisma migrate diff --from-url --to-url` между этой БД и БД, созданной
  через `db push`, дал **пустой diff** — baseline воспроизводит схему
  `db push` побитово.
- Сценарий обновления существующей БД (созданной ранее через `db push`, без
  истории миграций): `prisma migrate deploy` завершается ошибкой Prisma
  `P3005` («The database schema is not empty») — предсказуемый,
  недеструктивный отказ, а не потеря данных. После
  `prisma migrate resolve --applied 20260831030000_init` повторный
  `migrate deploy` сообщает «No pending migrations to apply» — процедура
  baseline подтверждена практически, а не только описана.

Production-пути переведены с `db push --accept-data-loss` на
`migrate deploy` с локальным бинарём Prisma (не `npx`, что снимает
зависимость от сети на офлайн-инсталляциях):
[`setup/execute/route.ts`](../../../apps/web/src/app/api/setup/execute/route.ts)
(с fallback на `npx` только если локальный бинарь отсутствует),
[`baremetal-install.sh`](../../../scripts/baremetal-install.sh),
[`baremetal-install.ps1`](../../../scripts/baremetal-install.ps1),
[`ems-platform.service`](../../../scripts/ems-platform.service),
[`Dockerfile`](../../../Dockerfile). Добавлена команда
`migrate:resolve-baseline` в
[`packages/database/package.json`](../../../packages/database/package.json)
для явного baseline существующих инсталляций.

Задокументирована процедура обновления и baseline в
[`BAREMETAL_OFFLINE_DEPLOYMENT.md`](../../../docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md)
(раздел 8) и [`PRODUCTION_DEPLOYMENT.md`](../../../docs/operations/PRODUCTION_DEPLOYMENT.md)
(новый раздел 5.1), с явным предупреждением об обязательном бэкапе перед
обновлением и объяснением ошибки P3005.

Добавлен регрессионный тест в
[`api-security.test.ts`](../../../apps/web/src/lib/__tests__/api-security.test.ts),
проверяющий, что ни один из пяти production-путей не содержит
`db push ... --accept-data-loss` в исполняемых (не закомментированных)
строках и что каждый использует `migrate deploy`; второй тест проверяет
физическое наличие baseline-миграции и `migration_lock.toml`.

`packages/database/node_modules/.bin/prisma` подтверждён как реальный
исполняемый файл (не только запись в package.json), что закрывает
опасение Step 4 плана об `execSync` с `npx` внутри HTTP-обработчика.

Гейты: `pnpm test` — 190/190, `pnpm lint`, `tsc --noEmit`, `pnpm build`,
`node scripts/check-quality-baseline.mjs`, `node scripts/check-doc-links.mjs`
— все PASS. Схема `schema.prisma` не изменена — baseline описывает её как
есть, без сопутствующих улучшений.
