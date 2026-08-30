---
id: K2
title: Восстановить declaration build пакета auth
status: active
phase: K
priority: P0
risk: high
skills: [senior-backend, strict-api, zero-hallucination-coder]
opened: 2026-08-30
closed: null
commits: []
gates: [build, test, lint, tsc, check:quality, check:docs]
---

# K2 — Восстановить declaration build пакета auth

## Problem

Полный `pnpm build` падает с TS2742 при генерации деклараций для `@ems/auth`.
TypeScript не может сформировать переносимые inferred return types для
[`createInternalServiceRequest()`](../../apps/web/src/lib/jira/service-requests.ts:118)
и [`createMroWorkOrderFromIssue()`](../../apps/web/src/lib/jira/service-requests.ts:164)
без ссылки на приватный Prisma runtime внутри `packages/database/node_modules`.
Web-only `tsc --noEmit` эту ошибку не выявляет.

## Scope

- Определить, почему [`packages/auth/tsconfig.json`](../../packages/auth/tsconfig.json)
  включает web service-request source в declaration surface.
- Выбрать минимальное исправление: явные стабильные return types либо коррекция
  package boundary/tsconfig/import graph.
- Не использовать deep import из Prisma runtime и не экспортировать приватные
  пути `node_modules` в публичных типах.
- Не менять SRM/MRO бизнес-поведение, структуру БД и API response contracts.

## Steps

1. Проследить import graph от `packages/auth/src` до `service-requests.ts`.
2. Зафиксировать существующие consumer expectations для двух экспортов.
3. Ввести именованные переносимые DTO/result interfaces или разорвать неверную
   compile-time зависимость пакетов.
4. Добавить type-level/regression verification там, где она предотвращает
   повторное появление TS2742.
5. Запустить build сначала для `@ems/auth`, затем для всего монорепозитория.

## Definition of Done

- [ ] `pnpm --filter @ems/auth build` завершается успешно.
- [ ] `pnpm build` завершается успешно без TS2742.
- [ ] Сгенерированные публичные типы не содержат deep/private Prisma runtime paths.
- [ ] Контракты SRM service request и MRO work-order не изменены.
- [ ] Full gate green: monorepo build, tests, lint, web tsc, quality и docs checks.

## Result

Заполняется при закрытии story.
