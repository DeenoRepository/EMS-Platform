---
id: O1
title: Покрыть тестами security-критичные роуты auth, setup, files и интеграции
status: active
phase: O
priority: P1
risk: high
skills: [senior-qa, senior-security]
opened: 2026-09-01
closed: null
commits: []
gates: [test, coverage, lint, tsc]
---

# O1 — Покрыть тестами security-критичные роуты auth, setup, files и интеграции

## Problem

Из 85 API-роутов исполняемые тесты есть у 33. Среди непокрытых —
роуты, отказ которых означает компрометацию системы, а не деградацию UX:

| Роут | Риск при регрессии |
|---|---|
| [`auth/me`](../../apps/web/src/app/api/auth/me/route.ts) | утечка профиля без сессии |
| [`auth/logout`](../../apps/web/src/app/api/auth/logout/route.ts) | не инвалидированная сессия |
| [`files` catch-all](../../apps/web/src/app/api/files/[...path]/route.ts) | path traversal, чтение чужих файлов |
| [`setup/execute`](../../apps/web/src/app/api/setup/execute/route.ts) | повторная инициализация на живой БД |
| [`setup/status`](../../apps/web/src/app/api/setup/status/route.ts) | раскрытие состояния установки |
| [`setup/test-db`](../../apps/web/src/app/api/setup/test-db/route.ts) | SSRF/утечка строки подключения |
| [`setup/test-ldap`](../../apps/web/src/app/api/setup/test-ldap/route.ts) | LDAP injection |
| [`admin/users`](../../apps/web/src/app/api/admin/users/route.ts) | эскалация привилегий |
| [`admin/audit-log`](../../apps/web/src/app/api/admin/audit-log/route.ts) | сокрытие следов |
| [`admin/database/dump`](../../apps/web/src/app/api/admin/database/dump/route.ts) | выгрузка всей БД |
| [`admin/settings/test-jira`](../../apps/web/src/app/api/admin/settings/test-jira/route.ts) | SSRF |
| [`admin/settings/test-ldap`](../../apps/web/src/app/api/admin/settings/test-ldap/route.ts) | SSRF/LDAP injection |
| [`admin/settings/test-srm`](../../apps/web/src/app/api/admin/settings/test-srm/route.ts) | SSRF |
| [`srm/test-connection`](../../apps/web/src/app/api/srm/test-connection/route.ts) | SSRF |
| [`system/health`](../../apps/web/src/app/api/system/health/route.ts) | раскрытие внутренней топологии |

Модуль [`audit.ts`](../../packages/auth/src/audit.ts) не имеет
собственного теста — он лишь косвенно затрагивается в
`admin.test.ts`, `mro.test.ts`, `wms.test.ts`.

## Scope

Добавить исполняемые контракт-тесты перечисленных роутов через
[`route-harness.ts`](../../apps/web/src/lib/__tests__/helpers/route-harness.ts)
и unit-тест `@ems/auth/audit`.

Не входит: изменение поведения роутов. Если тест выявляет реальную
уязвимость — заводится отдельная story фазы O с priority P0, тест
помечается `TODO(security)` и ссылается на неё, но не отключается.

## Steps

1. Создать `apps/web/src/lib/__tests__/auth-session-routes.test.ts`:
   `auth/me` (200 с валидным JWT, 401 без токена, 401 с истёкшим),
   `auth/logout` (очистка cookie, идемпотентность повторного вызова).
2. Создать `file-access-routes.test.ts` для `files/[...path]`:
   traversal-вектора `../`, `..%2f`, абсолютный путь, symlink-путь —
   все дают 400/403, легитимный путь даёт 200 и корректный content-type.
   Опереться на существующий [`file-access.test.ts`](../../apps/web/src/lib/__tests__/file-access.test.ts).
3. Создать `setup-routes.test.ts`: `setup/status`, `setup/execute`,
   `setup/test-db`, `setup/test-ldap`. Обязательно: `execute` отклоняется,
   когда установка уже завершена (через мок
   [`install-state.ts`](../../apps/web/src/lib/install-state.ts)).
4. Создать `admin-security-routes.test.ts`: `admin/users`,
   `admin/audit-log`, `admin/database/dump` — success, 401, 403 для
   пользователя без `ADMIN_*` permission, 500 без утечки stack trace.
5. Создать `outbound-connection-test-routes.test.ts` для четырёх
   `test-*`/`test-connection` роутов: проверить, что URL проходит через
   [`outbound-url.ts`](../../apps/web/src/lib/outbound-url.ts) и что
   внутренние адреса (`127.0.0.1`, `169.254.169.254`, `localhost`)
   отклоняются.
6. Создать `packages/auth/src/audit.test.ts`: запись события, устойчивость
   к падению записи (аудит не должен ронять основную операцию),
   отсутствие секретов в payload.
7. Прогнать `pnpm test` и `node scripts/check-coverage.mjs --report`.
8. Поднять пороги до строки «После O1» дорожной карты
   [`O0`](O0-coverage-roadmap.md): line 72 / reach 30 / component 1.

## Definition of Done

- [ ] 15 перечисленных роутов имеют исполняемые тесты.
- [ ] Каждый из них покрыт по осям success / 401 / 403 / invalid input.
- [ ] Для `files/[...path]` покрыты минимум 4 traversal-вектора.
- [ ] `packages/auth/src/audit.test.ts` существует и проверяет поведение.
- [ ] Ни один тест не подключается к PostgreSQL или LDAP.
- [ ] Пороги подняты до 72/30/1, baseline перегенерирован.
- [ ] Full gate green: test, coverage, lint, tsc.

## Result

Заполняется при закрытии.
