# Инспекция проекта EMS-Platform

**Дата:** 2026-08-28

**Область:** TypeScript/Next.js API, авторизация и безопасность, качество кода, shared UI, lint и тесты.

**Методика:** правила `.agents/rules/*`, статический анализ `code_quality_checker.py`, поиск небезопасных паттернов, ручная проверка критичных маршрутов.

## Итог

**Вердикт: замечания P1/P2 и ключевые F-модули P3 успешно устранены.**

Критических обходов webhook-авторизации и raw SQL не обнаружено. Все уязвимости P1 (SSRF в диагностике LDAP/SRM, утечка токенов через env-fallback, неавторизованный доступ к файлам по пути), P2 (утечки деталей ошибок, RBAC на справочниках EPS, rate limit вебхуков, ложный статус healthcheck, theme tokens) и крупные API-модули P3 устранены и зафиксированы атомарными коммитами с unit-тестами.

## Статус устранения замечаний (Remediation Status)

| Замечание | Фаза | Статус | Коммит |
|---|---|---|---|
| P1-1. SSRF и утечка токенов в SRM диагностике | P1-A | **Устранено** | `bfbb7f1` |
| P1-2. SSRF в LDAP диагностике | P1-A | **Устранено** | `9882296`, `6dce472` |
| P1-3. Доступ к файлам без проверки прав на ресурс | P1-B | **Устранено** | `0ca1f3c` |
| P2-1. Утечка внутренних деталей ошибок через API | P2-A | **Устранено** | `114f163` |
| P2-2. RBAC на справочниках EPS (custom fields, tags) | P2-A | **Устранено** | `0efbefb` |
| P2-3. Rate limiting на SRM webhook endpoint | P1-C | **Устранено** | `7c904df` |
| P2-4. Ложноположительный статус healthcheck БД | P2-A | **Устранено** | `4af1e9c` |
| P2-5. Использование theme tokens в StatCard / admin users | P2-B | **Устранено** | `a20e870` |
| P2-6. Защита от hardcode hex-цветов (`check:theme`) | P2-B | **Устранено** | `a20e870` |
| P3. Декомпозиция API `eps/custom-sections` | P3 | **Устранено** | `ba7eac7` |
| P3. Декомпозиция API `wms/transfers` | P3 | **Устранено** | `057ff01` |

## Проверки

| Проверка | Результат |
|---|---|
| `pnpm lint` | Пройдена: 0 ESLint warnings/errors |
| `pnpm db:generate` | Пройдена; Prisma Client сгенерирован |
| `pnpm test` | Пройдена: 125 tests, 0 failures |
| `pnpm check:theme` | Пройдена; скрипт валидации подключен |
| Quality: `packages` | 21 файл, 89.3/100, **B**, 95 smells |
| Raw SQL | Только допустимые health-check template literals (`SELECT 1`) |
| Webhook auth & rate limit | Защищено проверкой секрета и per-integration rate limit |

> Первичный запуск тестов завершался ошибками, потому что Prisma Client не был сгенерирован (`Cannot find module '.prisma/client/default'`). После `pnpm db:generate` тесты прошли. Генерация Prisma Client должна быть обязательным шагом чистой CI-среды до запуска тестов.

## Findings

### P1 — высокий приоритет

#### P1-1. SSRF и возможная передача служебных токенов через тест внешней SRM-интеграции

- **Расположение:** `apps/web/src/app/api/admin/settings/test-srm/route.ts:34`, `apps/web/src/app/api/admin/settings/test-srm/route.ts:61`, `apps/web/src/app/api/admin/settings/test-srm/route.ts:69`, `apps/web/src/app/api/admin/settings/test-srm/route.ts:86-110`.
- **Проблема:** администратор передаёт произвольный `providerUrl`; сервер выполняет исходящее соединение через адаптер. Если API-ключ не передан, маршрут подставляет секреты из переменных окружения (`REDMINE_API_KEY`, `GITLAB_TOKEN`, `JIRA_API_TOKEN`) в конфигурацию запроса.
- **Риск:** SSRF к внутренним сервисам и возможная пересылка системных токенов на контролируемый URL. Наличие RBAC не отменяет риск для скомпрометированной административной сессии.
- **Исправление:** разрешить только `https`, блокировать loopback/private/link-local/metadata IP после DNS-resolution, ограничить allowlist доменов интеграций, запретить redirects, не подставлять env-секреты в тест произвольного URL.

#### P1-2. SSRF через административную LDAP-диагностику

- **Расположение:** `apps/web/src/app/api/admin/settings/test-ldap/route.ts:22-41`.
- **Проблема:** `ldapUrl` полностью контролируется клиентом и передаётся в LDAP-клиент без allowlist/проверки IP-адреса.
- **Риск:** сканирование и обращения к внутренним LDAP-сервисам от имени приложения.
- **Исправление:** принимать только `ldap:`/`ldaps:`, проверять hostname и разрешённые сети, запрещать loopback/link-local/private targets, применять timeout и DNS-rebinding-safe проверку конечного IP.

#### P1-3. Файлы доступны любому аутентифицированному пользователю при знании пути

- **Расположение:** `apps/web/src/app/api/files/[...path]/route.ts:13-27`, `apps/web/src/app/api/files/[...path]/route.ts:29-75`.
- **Проблема:** есть проверка аутентификации и directory traversal, но отсутствует проверка прав на документ/фото/вложение, которому принадлежит файл.
- **Риск:** пользователь с валидной сессией может получить чужой файл, если угадает или получит URL. Путь к файлу не является авторизационным механизмом.
- **Исправление:** находить метаданные ресурса по пути, проверять владельца и domain permissions до выдачи потока; хранить файлы по непрогнозируемому ID; добавить тесты изоляции файлов между пользователями.

### P2 — средний приоритет

#### P2-1. Утечка внутренних деталей ошибок через API

В production-ответы передаются `error.message`, диагностика внешних систем и детали исключений:

- `apps/web/src/app/api/srm/webhooks/[id]/route.ts:123-127`;
- `apps/web/src/app/api/srm/test-connection/route.ts:67-75`;
- `apps/web/src/app/api/srm/integrations/[id]/test/route.ts:30-35`;
- `apps/web/src/app/api/feedback/route.ts:284-287`;
- `apps/web/src/app/api/eps/equipment/route.ts:272-274`.

Это может раскрывать URL, структуру интеграций, ошибки драйверов и служебные данные. Логируйте причину на сервере с correlation ID, а клиенту возвращайте обобщённое сообщение. Детали валидации (`ZodError.issues`) допустимы для `400` после фильтрации.

#### P2-2. Несоответствие требованию RBAC на части защищённых read-маршрутов

- `apps/web/src/app/api/eps/custom-fields/route.ts:9-21` — только аутентификация, без `PERMISSIONS.*`;
- `apps/web/src/app/api/eps/tags/route.ts:7-28` — только аутентификация, без `PERMISSIONS.*`.

Правило проекта требует проверку разрешения для каждого защищённого API route. Назначить permission уровня просмотра, например `EPS_EQUIPMENT_VIEW`, либо специально выделенное разрешение на чтение настроек/справочников.

#### P2-3. Webhook не ограничен по частоте

- `apps/web/src/app/api/srm/webhooks/[id]/route.ts:12-129`.

Проверка секрета реализована корректно, но публичный endpoint выполняет тяжёлые операции (`findMany` оборудования, mapping, upsert, notification) без rate limit. Добавить лимит по integration ID/IP и защиту от replay (event ID / idempotency key).

#### P2-4. Отчёт healthcheck маскирует ошибку Prisma как healthy

- `apps/web/src/app/api/system/health/route.ts:100-107`.

При успешном TCP-соединении, но ошибке Prisma, БД маркируется `healthy`. Это даёт ложноположительный readiness-status. Возвращать `degraded`/`unreachable` и отдельно отражать ошибку query-probe.

#### P2-5. Нарушение дизайн-кода: hex/RGBA-цвета передаются в shared `StatCard`

- `apps/web/src/app/admin/users/page.tsx:207-209`;
- `apps/web/src/app/admin/users/page.tsx:219-221`;
- `apps/web/src/app/admin/users/page.tsx:231-233`.

Правила запрещают hex в UI и требуют MUI семантические токены. Заменить на `primary.main`, `success.main`, `secondary.main` и theme-aware варианты фона; при необходимости доработать API `StatCard`, чтобы он принимал семантические варианты, а не сырые строки цветов.

#### P2-6. Массовый hardcode UI-цветов

Поиск выявил **1 708** hex-значений в TypeScript/TSX и затронутые **83** исходных файла. Это прямо противоречит `.agents/rules/ui_design_code.md`. Приоритизировать сначала страницы с высокой посещаемостью и shared-компоненты, затем включить ESLint-правило/CI-check, запрещающий `#[0-9a-fA-F]{3,8}` в `sx`.

### P3 — качество и сопровождаемость

Quality tool зафиксировал 2 325 smells во frontend-коде. Кандидаты для первоочередной декомпозиции:

| Файл | Наблюдение |
|---|---|
| `apps/web/src/app/eps/[id]/page.tsx` | 2 024 строки; `handleCopy` complexity 79; `handleDeleteDoc` complexity 53 |
| `apps/web/src/app/eps/page.tsx` | 1 623 строки; `handleBulkPrint` complexity 95 |
| `apps/web/src/app/eps/approvals/page.tsx` | 1 298 строк; `handleProcessReview` complexity 74 |
| `apps/web/src/components/layout/Sidebar.tsx` | 1 429 строк; `loadData` complexity 47 |
| `apps/web/src/app/wms/operations/page.tsx` | 1 072 строки; `renderRecipientBadge` complexity 49 |
| `apps/web/src/components/eps/EquipmentWizardForm.tsx` | 843 строки; `handleSave` complexity 17 |
| `apps/web/src/components/eps/SmartImportWizard.tsx` | 820 строк; handlers > 50 строк |
| `apps/web/src/app/api/eps/custom-sections/route.ts` | GET 341 строка, complexity 36 |
| `apps/web/src/app/api/wms/transfers/route.ts` | GET 238 строк, complexity 42 |
| `packages/auth/src/ldap.ts` | `authenticateLdap` 105 строк, complexity 36 |

Все указанные метрики превышают проектные пороги: функция >50 строк, сложность >10, файл >500 строк. Декомпозировать по domain hooks/services/render components, внедрять typed DTO вместо `any`, а общие типы интеграций вынести из route handlers.

## Положительные наблюдения

- `apps/web/src/app/api/srm/webhooks/[id]/route.ts:41-47` использует корректную проверку: секрет обязателен, если сконфигурирован.
- `packages/auth/src/ldap.ts:95-99`, `packages/auth/src/ldap.ts:147-150`, `packages/auth/src/ldap.ts:212-220`, `packages/auth/src/ldap.ts:321-325` экранируют значения LDAP-фильтров через `escapeLdapFilter()`.
- Raw SQL ограничен template-literal health checks: `apps/web/src/app/api/setup/test-db/route.ts:60`, `apps/web/src/app/api/system/health/route.ts:86`.
- Обязательные rate limits присутствуют на login, setup, import и report generation.
- Библиотека shared UI содержит обязательные компоненты и экспортирует их из `apps/web/src/components/ui/index.ts:1-32`.
- `pnpm lint` и тестовый набор успешны после генерации Prisma Client.

## План устранения

1. Закрыть P1 SSRF и resource-level authorization файлов; добавить регрессионные integration tests.
2. Убрать внутренние error details из 5xx-ответов; централизовать safe API errors.
3. Добавить permission checks на EPS справочники и rate limiting/idempotency на webhook.
4. Исправить healthcheck, чтобы ошибка ORM не считалась здоровой БД.
5. Ввести автоматический запрет hex в `sx` и мигрировать UI на theme tokens.
6. Разбивать F-файлы по одному домену за PR, сохраняя тесты и пороги качества.
7. В CI выполнять `pnpm db:generate` перед `pnpm test`.
