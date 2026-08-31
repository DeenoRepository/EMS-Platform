---
id: L2
title: Ввести версионированные миграции БД вместо db push
status: active
phase: L
priority: P0
risk: high
skills: [database-schema-designer, senior-backend, zero-hallucination-coder]
opened: 2026-08-31
closed: null
commits: []
gates: [test, lint, tsc, build, check:quality, check:docs]
---

# L2 — Ввести версионированные миграции БД вместо db push

## Problem

Каталога `packages/database/prisma/migrations/` не существует — в
[`packages/database/prisma/`](../../packages/database/prisma/) лежит только
`schema.prisma`. При этом:

- [`package.json:22`](../../package.json:22) объявляет
  `db:migrate:deploy` → `prisma migrate deploy`, которому **нечего применять**:
  без каталога миграций команда не создаст схему.
- Все реальные пути установки применяют схему через `db push --accept-data-loss`:
  [`setup/execute/route.ts:184`](../../apps/web/src/app/api/setup/execute/route.ts:184),
  [`baremetal-install.sh:72`](../../scripts/baremetal-install.sh:72),
  [`baremetal-install.ps1:42`](../../scripts/baremetal-install.ps1:42),
  [`BAREMETAL_OFFLINE_DEPLOYMENT.md:200`](../../docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md:200).

Для **первичной** установки на пустую БД это работает и данным не угрожает.
Риск возникает при **обновлении версии на работающей базе**: `db push`
приводит схему к целевому виду без плана и истории, а `--accept-data-loss`
явно разрешает деструктивные операции. Переименование поля выглядит для
`db push` как «удалить старое + создать новое» — данные столбца теряются
молча. Отката нет, так как нет зафиксированного шага, который можно
откатить.

Выявлено инспекцией
[`2026-08-31-inspection.md`](../../docs/quality/inspections/2026-08-31-inspection.md).

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
   [`setup/execute/route.ts:184`](../../apps/web/src/app/api/setup/execute/route.ts:184):
   `execSync` с `npx` внутри HTTP-обработчика зависит от наличия сети и
   `npx` в проде. Как минимум — вызывать локальный бинарь Prisma, не `npx`.
5. Проверить оба сценария на одноразовой БД: (а) чистая установка,
   (б) обновление инсталляции, развёрнутой предыдущей версией.
6. Обновить [`PRODUCTION_DEPLOYMENT.md`](../../docs/operations/PRODUCTION_DEPLOYMENT.md)
   и [`BAREMETAL_OFFLINE_DEPLOYMENT.md`](../../docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md):
   описать шаг миграции и обязательный бэкап перед ним.

## Definition of Done

- [ ] `packages/database/prisma/migrations/` содержит baseline, применение
      которого к пустой БД воспроизводит текущую схему.
- [ ] `pnpm db:migrate:deploy` создаёт рабочую схему с нуля.
- [ ] Ни один production-путь установки/обновления не использует
      `--accept-data-loss`.
- [ ] Описана процедура перевода уже работающей БД на baseline.
- [ ] Оба сценария (чистая установка и обновление) проверены на реальной БД,
      а не только на схеме.
- [ ] Полный набор гейтов зелёный: см. `gates:` во front-matter.

## Result

Заполняется при закрытии story.
