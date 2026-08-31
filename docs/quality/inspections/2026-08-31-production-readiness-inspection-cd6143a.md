# EMS-Platform — инспекция готовности к production (снимок 2026-08-31, HEAD `cd6143a`)

> **Неизменяемый снимок.** Фиксирует состояние ветки `main` на HEAD `cd6143a`.
> Актуальные вычисляемые метрики находятся в
> [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md),
> [`COVERAGE_BASELINE.md`](../COVERAGE_BASELINE.md) и
> [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md).
>
> Предыдущий снимок: [`2026-08-31-production-readiness-inspection-085f8fc.md`](2026-08-31-production-readiness-inspection-085f8fc.md).
> Данная инспекция — **независимая перепроверка**, а не копия предыдущей:
> все гейты выполнены заново, выводы предыдущего отчёта не принимались на веру.

**Дата:** 2026-08-31
**Ветка / HEAD:** `main` / `cd6143a`
**Среда проверки:** Windows 11, Node.js 24.15.0 (совпадает с [`.nvmrc`](../../../.nvmrc)), pnpm 11.16.0, Python 3.10.6
**Правила инспекции:** [`AGENTS.md`](../../../AGENTS.md),
[`security.md`](../../../.agents/rules/security.md),
[`code_quality.md`](../../../.agents/rules/code_quality.md),
`code-reviewer` skill (`rules/universal.md` + `languages/typescript.md`)

---

> ## Вердикт: ⚠️ CONDITIONAL GO
>
> **Все автоматические гейты зелёные, production build успешен.** Однако
> инспекция выявила **два ранее не зафиксированных дефекта уровня HIGH**
> (spoofable rate-limit key и эфемерный `.installed` lock), которые не
> детектируются существующими гейтами. Они не блокируют выпуск release
> candidate, но должны быть закрыты до выкладки в контур, доступный
> недоверенной сети.

> **Статус находок (обновлено после публикации снимка).** Разделы 2.1, 2.2,
> 2.3 и 2.6 закрыты в рамках
> [`M1`](../../../plans/done/2026-08/M1-production-readiness-findings.md).
> Сам снимок ниже не переписывается — он фиксирует состояние на момент
> инспекции. Разделы 2.4 (покрытие) и 2.5 (файлы уровня F) остаются
> открытым техническим долгом.

---

## 1. Результаты выполненных проверок

Все команды выполнены заново на HEAD `cd6143a`.

| Проверка | Команда | Результат |
|---|---|---|
| Соответствие версии Node.js | `node -v` vs [`.nvmrc`](../../../.nvmrc) | ✅ 24.15.0 == 24.15.0 |
| Целостность lockfile | `pnpm install --frozen-lockfile` | ✅ Already up to date |
| Генерация Prisma Client | `pnpm db:generate` | ✅ Prisma Client 6.19.3 |
| ESLint + локальные security rules | `pnpm lint` | ✅ 0 нарушений |
| Static security policies | (в составе `pnpm lint`) | ✅ PASS |
| TypeScript | `tsc --noEmit` | ✅ 0 ошибок типов |
| Node test suite | `pnpm test` | ✅ 342/342, 84 suites, 58 файлов |
| React component suite | `test:components` | ✅ 38/38, 6 файлов |
| Coverage gate | `check-coverage.mjs` | ✅ 70.53% / 22.76% / 1.89% |
| Quality baseline | `check-quality-baseline.mjs` | ✅ 8/8 порогов |
| Documentation links | `check-doc-links.mjs` | ✅ 120 файлов |
| Theme tokens | `check-theme-tokens.mjs` | ✅ 0 hex вне theme |
| Plans index | `plans-index.mjs --check` | ✅ актуален |
| Route security audit | `route_audit.py` | ✅ 85 routes, 0 без rate limit |
| Dependency audit | `pnpm audit --audit-level high` | ✅ No known vulnerabilities |
| Production build | `pnpm build` | ✅ 4/4 tasks, 33 страницы |
| Production Compose config | `docker compose config` | ✅ валиден |

**Не выполнялось в этой инспекции** (требует внешних ресурсов, результат
взят из предыдущего снимка и не перепроверялся): Playwright E2E (нужен живой
PostgreSQL), сборка Docker image, runtime migration smoke.

---

## 2. Новые находки

### 2.1 [HIGH] Rate limiting обходится подделкой заголовка `X-Forwarded-For`

**Файл:** [`apps/web/src/lib/rate-limit.ts`](../../../apps/web/src/lib/rate-limit.ts:167)

`getClientIp()` безусловно доверяет первому значению `X-Forwarded-For`:

```ts
const forwarded = req.headers.get('x-forwarded-for');
if (forwarded) {
  return forwarded.split(',')[0].trim();
}
```

[`nginx.conf`](../../../docker/nginx/nginx.conf:104) использует
`proxy_add_x_forwarded_for`, который **добавляет** реальный IP к уже
существующему клиентскому заголовку, а не заменяет его. Первый элемент списка
поэтому полностью контролируется клиентом.

**Последствие:** атакующий, отправляя случайный `X-Forwarded-For` в каждом
запросе, получает новый rate-limit bucket на каждый запрос. Это обнуляет
защиту на [`/api/auth/login`](../../../apps/web/src/app/api/auth/login/route.ts:20)
(лимит 10/мин) и делает возможным неограниченный перебор паролей. Затронуты
все 85 routes, так как все они используют один и тот же `enforceRateLimit()`.

Дополнительно: тот же неотфильтрованный заголовок пишется в аудит как
`ipAddress` в [`login/route.ts`](../../../apps/web/src/app/api/auth/login/route.ts:190),
что позволяет фальсифицировать audit trail.

Существующий гейт `require-rate-limit-on-sensitive-routes` проверяет только
**наличие** вызова limiter, но не корректность вычисления ключа, поэтому
дефект не детектируется.

**Рекомендация:** извлекать IP как последний недоверенный hop либо
использовать `X-Real-IP`, который nginx устанавливает из `$remote_addr`
([`nginx.conf`](../../../docker/nginx/nginx.conf:103)) и который клиент
подделать не может; число доверенных прокси задать конфигурацией.

### 2.2 [HIGH] Lock-файл `.installed` эфемерен в Docker-развёртывании

**Файлы:** [`setup/execute/route.ts`](../../../apps/web/src/app/api/setup/execute/route.ts:357),
[`Dockerfile`](../../../Dockerfile:45)

`.installed` пишется в `process.cwd()` внутри контейнера. В
[`docker-compose.prod.yml`](../../../docker-compose.prod.yml:80) на volume
смонтирован только `/app/uploads`, поэтому при пересоздании контейнера
(`up -d --build`, обновление образа) файл исчезает.

Смягчающие факторы (защита не сводится к одному файлу):
[`setup/status`](../../../apps/web/src/app/api/setup/status/route.ts:111)
считает систему установленной также при наличии пользователя с ролью `admin`
(`isInstalled = fileExists || hasAdmin`), а
[`middleware.ts`](../../../apps/web/src/middleware.ts:93) блокирует
`/api/setup/*` при `setupDone`.

**Остаточный риск:** проверка `hasAdmin` обёрнута в `catch { hasAdmin = false }`
([`status/route.ts`](../../../apps/web/src/app/api/setup/status/route.ts:107)).
При недоступности БД и отсутствии `.installed` система **fail-open**:
`isInstalled === false`, middleware пропускает `/api/setup/*`, а
[`execute`](../../../apps/web/src/app/api/setup/execute/route.ts:30) требует
superadmin-сессию только `if (fileInstalled)`. Окно эксплуатации — деградация
БД на свежесозданном контейнере; в этом состоянии анонимный запрос может
перезаписать `.env` (включая `DATABASE_URL` и `JWT_SECRET`) и создать
собственного суперадминистратора.

**Рекомендация:** хранить признак установки в БД либо на persistent volume и
переключить обработку недоступности БД на fail-closed.

### 2.3 [MEDIUM] Runtime Docker-образа расходится с обязательной версией Node.js

[`Dockerfile`](../../../Dockerfile:6) собирает на `node:22-alpine`, тогда как
[`.nvmrc`](../../../.nvmrc) и CI ([`ci.yml`](../../../.github/workflows/ci.yml:32))
фиксируют Node.js 24.15.0. Тесты, coverage и build верифицируются на Node 24,
а production-артефакт исполняется на Node 22 — проверенная и поставляемая
конфигурации не совпадают.

### 2.4 [MEDIUM] Абсолютное покрытие тестами остаётся очень низким

Coverage gate пройден, но его пороги отражают ratchet, а не достаточность:

- component line coverage — **1.89%** при пороге **≥ 1%**;
- Node-тестами загружается **84 из 369** production-файлов (22.76%).

70.53% относится только к загруженным файлам и не характеризует систему в
целом. Гейт защищает от регресса, но не доказывает покрытие критических
потоков. Подтверждено выводом `vitest run --coverage`: страницы
`app/**/page.tsx` и большинство компонентов `components/wms`, `components/eps`
имеют 0%.

### 2.5 [MEDIUM] Сохраняются файлы уровня F с высокой сложностью

`fgrade_detail.py` фиксирует 26 F-grade файлов (10 со score < 50). Наиболее
критичные по фактической цикломатической сложности:

| Файл | Функция | Сложность | Длина |
|---|---|---:|---:|
| [`app/srm/page.tsx`](../../../apps/web/src/app/srm/page.tsx) | `handleOpenDetails` | **35** | 428 строк |
| [`app/admin/module-settings/page.tsx`](../../../apps/web/src/app/admin/module-settings/page.tsx) | `ModuleSettingsContent` | **23** | 124 строки |
| [`components/wms/TransferRequestDialog.tsx`](../../../apps/web/src/components/wms/TransferRequestDialog.tsx) | `TransferRequestDialog` | **19** | 89 строк |
| [`app/wms/page.tsx`](../../../apps/web/src/app/wms/page.tsx) | `handleOpenWizard` | **17** | 65 строк |

Согласно [`code_quality.md`](../../../.agents/rules/code_quality.md), файлы с
оценкой F подлежат обязательному рефакторингу; порог baseline (≤ 34) при этом
формально соблюдён.

### 2.6 [LOW] CSP допускает `unsafe-inline` для скриптов

[`next.config.mjs`](../../../apps/web/next.config.mjs:73) задаёт
`script-src 'self' 'unsafe-inline'` в production, что существенно ослабляет
CSP как защиту от XSS. `connect-src` дополнительно разрешает произвольные
`http:` и `ws:`. Единственное использование `dangerouslySetInnerHTML` —
[`ThemeRegistry.tsx`](../../../apps/web/src/theme/ThemeRegistry.tsx:46) —
безопасно (сгенерированный Emotion CSS, не пользовательский ввод).

---

## 3. Подтверждённые сильные стороны

Проверено непосредственно в этой инспекции:

- **Webhook secret policy корректна:** [`srm/webhooks/[id]`](../../../apps/web/src/app/api/srm/webhooks/[id]/route.ts:58)
  реализует `if (!providedToken || providedToken !== secret)` и отклоняет
  активные интеграции без секрета, если не задан явный opt-in.
- **Rate limiting присутствует на всех 85 API routes**, sensitive routes без
  лимитера отсутствуют (замечание к вычислению ключа — в §2.1).
- **Cookies:** `httpOnly: true`, `sameSite: 'lax'`, `secure` — по фактическому
  HTTPS ([`login/route.ts`](../../../apps/web/src/app/api/auth/login/route.ts:210)).
- **Health endpoint** проверяет БД и запись в storage, возвращает 503 при
  `isReady === false` и скрывает диагностику от неавторизованных.
- **Секреты обязательны:** `JWT_SECRET` и `POSTGRES_PASSWORD` объявлены через
  `${VAR:?...}` в [`docker-compose.prod.yml`](../../../docker-compose.prod.yml:63);
  небезопасных fallback-значений нет.
- **Versioned Prisma migrations** присутствуют
  (`migrations/20260831030000_init`); startup использует `migrate deploy` и не
  подавляет ошибку ([`Dockerfile`](../../../Dockerfile:66)).
- **Нет raw SQL** с интерполяцией; единственный `$queryRaw` — статический
  `SELECT 1` в health-check.
- **LDAP-инъекции закрыты** `escapeLdapFilter()` с покрытием тестами.
- **Валидация входа** через `zod` на login с ограничением длины.
- **ESLint-подавления обоснованы** — все 3 точечные, с комментариями.
- **Dependency audit** не выявил high/critical уязвимостей.

---

## 4. Условия выхода на безусловный GO

**Блокирующие для публично доступного контура:**

1. Исправить вычисление ключа rate limiting (§2.1) и добавить регрессионный
   тест на подделку `X-Forwarded-For`.
2. Перевести признак установки на persistent-хранилище и сделать обработку
   недоступности БД fail-closed (§2.2).

**До выкладки:**

3. Согласовать Node.js runtime в [`Dockerfile`](../../../Dockerfile) с
   [`.nvmrc`](../../../.nvmrc) (§2.3).
4. Проверить внешний TLS ingress, redirect, HSTS и `/healthz` на production
   hostname; задать реальные secrets.
5. Выполнить backup, проверить restore в отдельной среде и документировать
   rollback.
6. Подключить сбор health/логов и alerting с утверждёнными SLO.

**Технический долг (не блокирует):** §2.4 расширение покрытия критических
потоков, §2.5 рефакторинг F-grade файлов, §2.6 ужесточение CSP.
