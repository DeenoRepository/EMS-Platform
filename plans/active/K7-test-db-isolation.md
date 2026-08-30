---
id: K7
title: Устранить внешнюю БД из unit-тестов auth-guard
status: active
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

- [ ] auth-guard unit tests не обращаются к внешней БД.
- [ ] Нет сетевых ошибок/таймаутов в обычном `pnpm test`.
- [ ] Все тесты проходят, включая negative auth/RBAC cases.
- [ ] Production-код auth-guard не изменён без необходимости.

## Result

Заполняется при закрытии story.
