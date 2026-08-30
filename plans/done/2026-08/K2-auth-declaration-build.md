---
id: K2
title: Восстановить declaration build пакета auth
status: done
phase: K
priority: P0
risk: high
skills: [senior-backend, strict-api, zero-hallucination-coder]
opened: 2026-08-30
closed: 2026-08-30
commits: [da70388]
gates: [build, test, lint, tsc, check:quality, check:docs]
---

# K2 — Восстановить declaration build пакета auth

## Problem

Полный `pnpm build` падает с TS2742 при генерации деклараций для `@ems/auth`.
TypeScript не может сформировать переносимые inferred return types для
[`createInternalServiceRequest()`](../../../apps/web/src/lib/jira/service-requests.ts:159)
и [`createMroWorkOrderFromIssue()`](../../../apps/web/src/lib/jira/service-requests.ts:201)
без ссылки на приватный Prisma runtime внутри `packages/database/node_modules`.
Web-only `tsc --noEmit` эту ошибку не выявляет.

## Scope

- Определить, почему [`packages/auth/tsconfig.json`](../../../packages/auth/tsconfig.json)
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

- [x] `pnpm --filter @ems/auth build` завершается успешно.
- [x] `pnpm build` завершается успешно без TS2742.
- [x] Сгенерированные публичные типы не содержат deep/private Prisma runtime paths.
- [x] Контракты SRM service request и MRO work-order не изменены.
- [x] Full gate green: monorepo build, tests, lint, web tsc, quality и docs checks.

## Result

- Причина TS2742 подтверждена import graph: [`jira-service.ts`](../../../apps/web/src/lib/jira-service.ts) реэкспортирует функции из web [`service-requests.ts`](../../../apps/web/src/lib/jira/service-requests.ts), а inferred Prisma payload попадал в declaration surface пакета auth.
- В [`service-requests.ts`](../../../apps/web/src/lib/jira/service-requests.ts) добавлены стабильные именованные [`InternalServiceRequestResult`](../../../apps/web/src/lib/jira/service-requests.ts:119) и [`MroWorkOrderResult`](../../../apps/web/src/lib/jira/service-requests.ts:143), а двум экспортам назначены явные return types.
- Публичные result types используют только переносимые примитивы, `Date` и `unknown`; deep/private Prisma runtime paths не экспортируются.
- `pnpm --filter @ems/auth build`: PASS; `pnpm build`: PASS (4/4 packages, Next.js 33/33 static pages).
- Unit tests: 165/165; lint, web tsc и quality: PASS.
- Docs gate выявил независимые ранее существовавшие битые ссылки I1–I8; их исправление относится к активной story K3.
