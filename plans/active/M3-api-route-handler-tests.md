---
id: M3
title: Покрыть тестами API-роуты — RBAC, rate-limit, валидация ввода
status: active
phase: M
priority: P1
risk: medium
skills: [senior-qa, senior-backend, senior-security]
opened: 2026-08-31
closed: null
commits: []
gates: [test, lint, tsc, check:docs]
---

# M3 — Покрыть тестами API-роуты — RBAC, rate-limit, валидация ввода

## Problem

Ни один из **85** файлов `apps/web/src/app/api/**/route.ts` не покрыт
тестом. Из них **49** выполняют операции записи
(`create`/`update`/`delete`/`upsert`), **9** используют `$transaction`.

Это самая рискованная часть системы: именно здесь живут требования
[`AGENTS.md`](../../AGENTS.md) — RBAC через `requireAuth(req, PERMISSIONS.*)`,
обязательный `enforceRateLimit()`, fail-closed проверка webhook-токена.
Сейчас их соблюдение проверяется статически
([`route_audit.py`](../../scripts/route_audit.py) считает наличие вызовов),
но **поведение** не проверяется ничем: роут может вызывать `requireAuth()`
и игнорировать результат — аудит будет зелёным.

Косвенное подтверждение важности: единственный поведенческий тест такого
рода — fail-closed webhook в
[`api-security.test.ts:159`](../../apps/web/src/lib/__tests__/api-security.test.ts:159) —
закреплён отдельным пунктом в предыдущей инспекции. Для остальных 84
роутов такой защиты нет.

Барьер был технический и **уже снят экспериментально**: прямой импорт
роута падал с `Cannot find module '@/lib/auth-guard'`, потому что `tsx`
из корня монорепозитория не видит `paths` из
[`apps/web/tsconfig.json`](../../apps/web/tsconfig.json). С
`TSX_TSCONFIG_PATH=apps/web/tsconfig.json` тест на `GET /api/feedback`
с подменённым через `mock.module('@ems/database')` Prisma проходит и
возвращает ожидаемый `401`. Детали —
[`2026-08-31-test-coverage-inspection.md`](../../docs/quality/inspections/2026-08-31-test-coverage-inspection.md) §3.5.

## Scope

**Изменяется:** добавляются тесты роутов и общая тестовая утилита для их
вызова; в [`test-runner.mjs`](../../scripts/test-runner.mjs) прописывается
`TSX_TSCONFIG_PATH`.

**Не изменяется:**
- Поведение роутов. Если тест обнаружит реальную уязвимость (например,
  отсутствие RBAC) — правка делается **отдельной** story, здесь только
  фиксируется факт: тест помечается `test.todo` со ссылкой.
- Настоящая БД не поднимается: только `mock.module('@ems/database')`,
  как в
  [`auth-guard.test.ts:39`](../../apps/web/src/lib/__tests__/auth-guard.test.ts:39).
  Проверки против живой БД — задача E2E (`M5`).

**Зависимость:** после [`M1`](M1-test-runner-discovers-all-tests.md) и
[`M2`](M2-coverage-measurement-and-gate.md).

## Steps

1. Прописать `TSX_TSCONFIG_PATH=apps/web/tsconfig.json` в окружении
   дочернего процесса в [`test-runner.mjs`](../../scripts/test-runner.mjs)
   с комментарием, объясняющим причину (как это сделано для
   `--experimental-test-module-mocks`).
2. Создать `apps/web/src/lib/__tests__/helpers/route-harness.ts`:
   фабрика `NextRequest` (тело, query, cookies), готовые пользователи
   (админ / ограниченная роль / аноним), переиспользуемый мок Prisma.
3. Для каждого роута из списка ниже — минимальный контракт из 3 проверок:
   аноним → `401`; роль без нужного `PERMISSIONS.*` → `403`; корректный
   запрос → `2xx` и ожидаемая форма ответа.
4. Дополнительно, где применимо: превышение `enforceRateLimit()` → `429`;
   невалидное тело → `400` без утечки внутренних деталей (сверяться с
   [`safe-error.ts`](../../apps/web/src/lib/safe-error.ts)).

### Очерёдность (по риску: запись + транзакции + объём)

| Волна | Роуты |
|---|---|
| 1 — запись и деньги/склад | [`wms/transfers`](../../apps/web/src/app/api/wms/transfers/route.ts), [`wms/operations`](../../apps/web/src/app/api/wms/operations/route.ts), [`wms/transfers/[id]/receive`](../../apps/web/src/app/api/wms/transfers/[id]/receive/route.ts), [`wms/transfers/[id]/dispatch`](../../apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts), [`wms/transfers/[id]/reject`](../../apps/web/src/app/api/wms/transfers/[id]/reject/route.ts) |
| 2 — аутентификация и установка | [`auth/login`](../../apps/web/src/app/api/auth/login/route.ts), [`setup/execute`](../../apps/web/src/app/api/setup/execute/route.ts), [`setup/status`](../../apps/web/src/app/api/setup/status/route.ts) |
| 3 — EPS-домен | [`eps/equipment/[id]`](../../apps/web/src/app/api/eps/equipment/[id]/route.ts), [`eps/approvals/[id]`](../../apps/web/src/app/api/eps/approvals/[id]/route.ts), [`eps/import/execute`](../../apps/web/src/app/api/eps/import/execute/route.ts), [`eps/equipment`](../../apps/web/src/app/api/eps/equipment/route.ts) |
| 4 — интеграции и остальное | [`srm/issues/[id]`](../../apps/web/src/app/api/srm/issues/[id]/route.ts), [`srm/integrations/[id]`](../../apps/web/src/app/api/srm/integrations/[id]/route.ts), [`feedback`](../../apps/web/src/app/api/feedback/route.ts), [`system/maintenance`](../../apps/web/src/app/api/system/maintenance/route.ts) |

Волны закрываются последовательно и могут быть выделены в подстории
`M3.1`–`M3.4`, если объём одной волны превысит разумный размер коммита.

## Definition of Done

- [ ] Все роуты волн 1–2 покрыты контрактом «401 / 403 / 2xx».
- [ ] Роуты с `enforceRateLimit()` из волн 1–2 имеют проверку на `429`.
- [ ] Ни один тест не открывает соединение с PostgreSQL (подтверждается
      счётчиком попыток `$connect`, как в
      [`auth-guard.test.ts:42`](../../apps/web/src/lib/__tests__/auth-guard.test.ts:42)).
- [ ] Охват файлов по [`M2`](M2-coverage-measurement-and-gate.md) вырос;
      новый порог зафиксирован.
- [ ] Найденные дефекты безопасности вынесены в отдельные story, а не
      исправлены молча.
- [ ] Полный гейт зелёный.

## Result

Заполняется при закрытии story.
