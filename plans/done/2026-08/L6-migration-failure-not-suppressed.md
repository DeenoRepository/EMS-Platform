---
id: L6
title: Не подавлять провал миграции при старте в Docker и systemd
status: done
phase: L
priority: P1
risk: medium
skills: [docker-development, senior-backend]
opened: 2026-08-31
closed: 2026-08-31
commits: [ce2f0d0]
gates: [test, lint, tsc, build, check:quality, check:docs]
---

# L6 — Не подавлять провал миграции при старте в Docker и systemd

## Problem

[L2](L2-prisma-migration-baseline.md) перевела применение схемы
на `prisma migrate deploy`, чтобы БД из инсталляции до baseline не изменялась
молча: Prisma в этом случае возвращает ошибку **P3005** («схема не пуста, а
истории миграций нет»). Но два пути запуска этот код возврата подавляют, и
защита не срабатывает.

- [`Dockerfile:62`](../../../Dockerfile:62) — `... migrate deploy || true; ... start`.
  Комментарий строкой выше при этом утверждает обратное: *«it **fails loudly**
  instead of altering data»*.
- [`ems-platform.service:20`](../../../scripts/ems-platform.service:20) —
  `ExecStartPre=-/bin/sh -c '... migrate deploy ... || true'`: подавление
  задано дважды, префиксом `-` и `|| true`. Комментарий выше также обещает
  «fails loudly».

Практическое следствие: на БД, созданной до L2 через `db push`, `migrate deploy`
корректно откажется работать, но контейнер/служба это проигнорируют и поднимут
приложение **поверх непромигрированной схемы**. Приложение стартует, healthcheck
зелёный, расхождение схемы и кода проявится позже и не в момент развёртывания.

Данные при этом не разрушаются (`--accept-data-loss` из production-путей убран,
`migrate deploy` неразрушающая) — поэтому это не blocker, а именно потеря
сигнала о проблеме.

Для сравнения, [`baremetal-install.sh:72`](../../../scripts/baremetal-install.sh:72)
сделан правильно: код возврата захватывается в `PRISMA_STATUS` и пользователю
выводится подсказка про baseline.

Существующий регрессионный тест
([`api-security.test.ts:293`](../../../apps/web/src/lib/__tests__/api-security.test.ts:293))
проверяет отсутствие `db push --accept-data-loss` и наличие `migrate deploy`, но
не проверяет, что результат не подавлен — поэтому дефект прошёл гейты.

Выявлено при инспекции выполнения фазы L.

## Scope

**Изменяется:** обработка кода возврата `migrate deploy` в `Dockerfile` и
`ems-platform.service`; регрессионный тест расширяется проверкой на подавление.

**Не изменяется:**
- Сама команда применения схемы — `migrate deploy` остаётся.
- Порядок «сначала миграции, затем старт приложения».
- [`baremetal-install.sh`](../../../scripts/baremetal-install.sh) и
  [`baremetal-install.ps1`](../../../scripts/baremetal-install.ps1) — там обработка
  уже корректная: инсталлятор обязан продолжить работу и показать инструкцию, а
  не упасть.
- Схема БД, код приложения, публичные контракты.

## Steps

1. В [`Dockerfile`](../../../Dockerfile) убрать `|| true`, чтобы неуспешная
   миграция останавливала запуск контейнера до старта Next.js.
2. В [`ems-platform.service`](../../../scripts/ems-platform.service) убрать `|| true`
   и префикс `-` у `ExecStartPre`, чтобы systemd не запускал `ExecStart` при
   неуспешной миграции.
3. Убедиться, что сообщение Prisma (в том числе P3005) попадает в логи
   контейнера и в journal — иначе останов будет без объяснения причины.
4. Расширить регрессионный тест: для `Dockerfile` и `ems-platform.service`
   запретить подавление результата (`|| true`, `|| :`, `ExecStartPre=-`).
   Тест должен падать на текущем состоянии до внесения правок.
5. Сверить комментарии в обоих файлах с фактическим поведением.

## Definition of Done

- [x] Неуспешная `migrate deploy` не приводит к старту приложения ни в Docker,
      ни под systemd.
- [x] Причина отказа видна в логах.
- [x] Регрессионный тест ловит возврат подавления (проверено: падает до фикса).
- [x] Инсталляторы bare-metal сохраняют прежнее поведение с подсказкой.
- [x] Комментарии соответствуют фактическому поведению.
- [x] Полный набор гейтов зелёный: см. `gates:` во front-matter.

## Result

В [`Dockerfile`](../../../Dockerfile) `migrate deploy || true; start` заменено
на `migrate deploy && start`: неуспешная миграция останавливает контейнер, и
ошибка Prisma остаётся последней записью в `docker logs`. Семантика проверена
на шелле: `false && echo` не выполняет вторую команду и возвращает 1.

В [`ems-platform.service`](../../../scripts/ems-platform.service) убраны оба
подавления — `|| true` и префикс `-` у `ExecStartPre`. Теперь при неуспешной
миграции systemd не запускает `ExecStart`, а юнит переходит в состояние
`failed` с текстом ошибки в `journalctl -u ems-platform`. Юнит проверен
`systemd-analyze verify`: синтаксических ошибок нет (единственное сообщение —
отсутствие `/opt/ems-platform` на машине разработки, что ожидаемо).

Регрессионный тест добавлен в
[`api-security.test.ts`](../../../apps/web/src/lib/__tests__/api-security.test.ts):
для `Dockerfile` и `ems-platform.service` запрещены `migrate deploy || true`,
`|| :` и `ExecStartPre=-`. Тест **сначала подтверждён как падающий** на
дефектном состоянии (`Dockerfile must not swallow a failed 'migrate deploy'`),
и только затем внесены правки — иначе гарантии, что он ловит именно эту
регрессию, не было бы. Инсталляторы `baremetal-install.sh/.ps1` в список
намеренно не включены: там код возврата обрабатывается явно, и инсталлятор
обязан продолжить работу с подсказкой про baseline, а не оборваться.

Изменение поведения потребовало правки документации, так как прежние
инструкции опирались на то, что контейнер поднимется:
[`PRODUCTION_DEPLOYMENT.md`](../../../docs/operations/PRODUCTION_DEPLOYMENT.md)
— `docker compose exec` в остановленный контейнер невозможен, поэтому baseline
теперь выполняется через `run --rm --no-deps`, а вместо `restart` используется
`up -d`; [`BAREMETAL_OFFLINE_DEPLOYMENT.md`](../../../docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md)
— добавлено пояснение, что служба намеренно не поднимется, с командами
диагностики.

Комментарии в обоих файлах приведены в соответствие с фактическим поведением:
прежняя формулировка «fails loudly» противоречила коду строкой ниже и была
причиной того, что дефект не заметили при закрытии L2.

Гейты: 193 теста (было 192), lint без кеша, `tsc`, `pnpm build`,
`docker build --check` («no warnings found»), quality baseline, theme,
doc links — все зелёные.
