---
id: M1
title: Close production readiness inspection findings
status: done
phase: M
priority: P0
risk: high
skills: [senior-secops, code-reviewer]
opened: 2026-08-31
closed: 2026-08-31
commits: [ec75aa8]
gates: [lint, tsc, test, coverage, quality, build]
---

# M1 — Close production readiness inspection findings

## Problem

Инспекция готовности к production на HEAD `cd6143a`
([отчёт](../../../docs/quality/inspections/2026-08-31-production-readiness-inspection-cd6143a.md))
выявила дефекты, не детектируемые существующими гейтами.

**HIGH — обход rate limiting.** `getClientIp()` в
[`rate-limit.ts`](../../../apps/web/src/lib/rate-limit.ts) брал первый элемент
`X-Forwarded-For`. Nginx использует `proxy_add_x_forwarded_for`, который
**дописывает** реальный адрес справа, поэтому левые элементы полностью
контролируются клиентом. Подстановка случайного заголовка давала новый bucket
на каждый запрос, что обнуляло лимит 10/мин на `/api/auth/login` и открывало
неограниченный перебор паролей. Тот же неотфильтрованный заголовок писался в
audit trail как `ipAddress`.

**HIGH — fail-open мастера настройки.** Признак установки определялся файлом
`.installed` в `process.cwd()`, который не попадает на volume и исчезает при
пересоздании контейнера. Проверка `hasAdmin` была обёрнута в
`catch { hasAdmin = false }`, поэтому при недоступности БД система считала
себя неустановленной, и анонимный запрос мог перезаписать `.env` (включая
`DATABASE_URL` и `JWT_SECRET`) и создать своего суперадминистратора.

**MEDIUM** — [`Dockerfile`](../../../Dockerfile) собирался на `node:22-alpine`
при закреплённом в [`.nvmrc`](../../../.nvmrc) Node.js 24.

**LOW** — CSP в production разрешала `connect-src` к произвольным `http:`/`ws:`.

## Scope

Изменяются: вычисление IP клиента, определение состояния установки, версия
Node.js в образе, CSP, локальное ESLint-правило `setup-reinstallation-guard`.

Явно НЕ изменяются: API-контракты, схема БД, поведение UI, пороги гейтов,
состав и структура существующих тестов, кроме двух проверок `getClientIp`,
которые фиксировали уязвимое поведение.

## Steps

1. Вычислять IP клиента от правого края `X-Forwarded-For` с учётом
   `TRUSTED_PROXY_COUNT`; заменить сырой заголовок на `getClientIp()` в аудите
   login/logout.
2. Ввести [`install-state.ts`](../../../apps/web/src/lib/install-state.ts):
   persistent маркер в каталоге на volume и fail-closed при недоступности БД.
3. Перевести `setup/execute`, `setup/status`, `setup/test-db`,
   `setup/test-ldap` и `middleware.ts` на новый helper.
4. Обновить правило `setup-reinstallation-guard` на требование
   `resolveInstallState(` вместо имени переменной `fileInstalled`.
5. Синхронизировать Node.js в образе с `.nvmrc`; ужесточить CSP.
6. Задокументировать `TRUSTED_PROXY_COUNT` в env-шаблоне и обоих Compose.

## Definition of Done

- [x] Спуфинг `X-Forwarded-For` не создаёт новый rate-limit bucket (регрессионный тест).
- [x] При недоступности БД `resolveInstallState()` возвращает `isInstalled: true`.
- [x] Маркер установки переживает пересоздание контейнера (тест на persistent каталог).
- [x] Версия Node.js в `Dockerfile` совпадает с `.nvmrc`.
- [x] Полный гейт зелёный: lint, tsc, test, coverage, quality, build.

## Result

Закрыты оба HIGH-дефекта, MEDIUM по версии Node.js и LOW по CSP.

Добавлено 13 проверок (342 → 355), из них регрессионные: спуфинг
`X-Forwarded-For`, fail-closed при недоступности БД и сохранение маркера при
пересоздании контейнера. Coverage вырос с 70.53%/22.76% до 70.86%/22.97%,
code smells 2302 → 2300.

Правило `setup-reinstallation-guard` **ужесточено**, а не ослаблено: оно
требует именно `resolveInstallState(`, поэтому возврат к проверке по файлу в
`process.cwd()` теперь падает на CI.

Отдельно исправлен дефект в собственном тесте: `rootDir/../..` при плоском
временном каталоге выходил за пределы `os.tmpdir()` и писал маркер в
пользовательский каталог, что ломало последующие прогоны. Тест воспроизводит
реальную раскладку `apps/web` и удаляет временный каталог за собой.

Не закрыто (технический долг, зафиксирован в отчёте инспекции): низкое
абсолютное покрытие тестами и 26 файлов уровня F.
