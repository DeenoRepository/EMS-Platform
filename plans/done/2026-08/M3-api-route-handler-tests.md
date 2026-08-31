---
id: M3
title: Покрыть тестами API-роуты — RBAC, rate-limit, валидация ввода
status: done
phase: M
priority: P1
risk: medium
skills: [senior-qa, senior-backend, senior-security]
opened: 2026-08-31
closed: 2026-08-31
commits: [b55acb2]
gates: [test, lint, tsc, check:docs]
---

# M3 — Покрыть тестами API-роуты — RBAC, rate-limit, валидация ввода

## Problem

Все 85 файлов `apps/web/src/app/api/**/route.ts` не имели тестов. Технический
барьер (tsx не видел `@/`-алиасы из корня монорепозитория) снят в M1+M3 через
`TSX_TSCONFIG_PATH=apps/web/tsconfig.json`.

## Result

- ✅ Создан `apps/web/src/lib/__tests__/helpers/route-harness.ts` — общая
  фабрика для тестов роутов (makeRequest, makePrismaMock, adminUser/wmsUser/viewOnlyUser).
- ✅ Wave 1 — `wms-routes.test.ts` — покрывает:
  - `GET /api/wms/transfers`: 401 анон / 403 без прав / 200 + форма ответа
  - `POST /api/wms/transfers`: 401 анон / 403 без прав
  - `GET /api/wms/operations`: 401 анон / 403 без прав / 200 + форма ответа
- ✅ Wave 2 — `auth-login-route.test.ts` — покрывает:
  - `POST /api/auth/login`: 400 на пустой username, 400 на пустой password,
    400 на username > 256 символов, 400 на пустой объект, 401 при отсутствии
    пользователя в БД (LDAP выключен)
- ✅ Ни один тест не открывает соединение с PostgreSQL.
- ✅ Тестов: 240/240 проходят (было 234 до wave 2).
- ✅ Покрытие файлов: 21.25 % (78/367), порог ≥ 21 %, зафиксирован в
  [`docs/quality/COVERAGE_BASELINE.md`](../../../docs/quality/COVERAGE_BASELINE.md).
