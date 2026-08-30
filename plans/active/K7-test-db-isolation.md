---
id: K7
title: Устранить внешнюю БД из unit-тестов auth-guard
status: done
phase: K
priority: P3
risk: low
skills: [senior-qa, senior-backend]
opened: 2026-08-30
closed: null
commits: []
gates: [test, lint, tsc]
---

# K7 — Устранить внешнюю БД из unit-тестов auth-guard

## Problem

Во время `pnpm test` раннер выводит ошибку подключения к PostgreSQL и зависит
от настроек внешней среды, хотя 160 тестов проходят. Unit-тесты
[`auth-guard`](../../apps/web/src/lib/__tests__/auth-guard.test.ts) должны быть
детерминированными и не тратить время на сетевые таймауты.

## Scope

- Найти оставшийся реальный Prisma call/import в auth-guard test setup.
- Замокать DB boundary на уровне теста, сохранив проверки JWT, permissions и
  error responses.
- Не менять production auth behavior, Prisma schema или integration tests.
- Отдельно документировать тесты, которым действительно нужна PostgreSQL.

## Steps

1. Зафиксировать источник соединения и вызываемый метод через test runner.
2. Перенести mock до импорта модуля, если это требуется module graph.
3. Добавить assertion, что unit suite не создаёт внешний DB connection.
4. Проверить время и вывод полного тестового прогона.

## Definition of Done

- [x] auth-guard unit tests не обращаются к внешней БД.
- [x] Нет сетевых ошибок/таймаутов в обычном `pnpm test`.
- [x] Все тесты проходят, включая negative auth/RBAC cases.
- [x] Production-код auth-guard не изменён без необходимости.

## Result

- Источник подключения зафиксирован: `@ems/database` импортируется через RBAC и
  maintenance-mode ветку auth guard; ранее это порождало реальный Prisma call.
- В [`auth-guard.test.ts`](../../apps/web/src/lib/__tests__/auth-guard.test.ts)
  сохранён ранний `mock.module('@ems/database')`, добавлен fail-fast `$connect`
  счётчик и assertion отсутствия соединения.
- В security regression test удалено только чувствительное внешнее DB-сообщение;
  проверка санитизации сохранена на нейтральной внутренней ошибке.
- `auth-guard` suite: 16/16, без DB connection errors.
- Полный `pnpm test`: 161/161, 50 suites, 2.61 s.
- Отдельный прогон всех auth/web unit-файлов: PostgreSQL connection errors не
  обнаружены.
- Тесты, которым нужна PostgreSQL: integration/setup и runtime health/backup
  сценарии; они не входят в unit test runner и должны запускаться с отдельной
  тестовой БД.
