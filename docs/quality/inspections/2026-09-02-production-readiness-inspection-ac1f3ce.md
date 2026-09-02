# EMS-Platform — инспекция готовности к продакшену и устранение замечаний (снимок 2026-09-02)

> **Неизменяемый снимок.** Фиксирует инспекцию состояния на HEAD `ac1f3ce` и
> исправления, внесённые в рамках этой проверки.
> Актуальные вычисляемые метрики находятся в
> [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md),
> [`COVERAGE_BASELINE.md`](../COVERAGE_BASELINE.md) и
> [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md).

**Дата:** 2026-09-02
**Исходный HEAD:** `ac1f3ce` («test: закрыть O6 domain forms and wizards coverage»)
**Скилл:** [`code-reviewer`](../../../.agents/skills/code-reviewer/SKILL.md)
**Правила:** [`universal.md`](../../../.agents/skills/code-reviewer/rules/universal.md),
[`typescript.md`](../../../.agents/skills/code-reviewer/languages/typescript.md),
[`AGENTS.md`](../../../AGENTS.md)

> **Вердикт: ✅ готово к релизу после исправлений этой инспекции.**
> На исходном коммите CI падал на двух обязательных шагах. Оба дефекта
> устранены, полный CI-эквивалентный набор проверок зелёный на версии Node из
> [`.nvmrc`](../../../.nvmrc), включая production build. Дополнительно закрыт
> вектор утечки production-секретов в слой Docker-образа.

---

## 1. Результаты релизных гейтов после исправлений

Все проверки выполнены на **Node 24.15.0** (версия из [`.nvmrc`](../../../.nvmrc),
та же, что в CI) в контейнере `node:24.15.0-bookworm`.

| Проверка | Итог |
|---|---|
| `pnpm audit --audit-level=high` | ✅ No known vulnerabilities |
| TypeScript `tsc --noEmit` | ✅ PASS |
| `pnpm check:theme` | ✅ PASS |
| `pnpm check:docs` | ✅ PASS (144 файла) |
| Синтаксис скриптов (`node --check`) | ✅ PASS |
| `pnpm lint` (ESLint + static security policies) | ✅ PASS |
| `pnpm check:quality` | ✅ PASS (обе области) |
| `node scripts/plans-index.mjs --check` | ✅ PASS |
| `pnpm test` | ✅ PASS — **641 тест**, 0 fail |
| Vitest + RTL (component) | ✅ PASS |
| Coverage gate | ✅ PASS — 79.34 / 47.17 / 38.60 |
| `QUALITY_BASELINE.md` / `COVERAGE_BASELINE.md` | ✅ Перегенерированы, повторный прогон байт-идентичен |
| `SECURITY_BASELINE.md` | ✅ Без расхождений |
| Production build (`pnpm build`) | ✅ PASS — 4/4 Turbo tasks |

Не выполнялось: Playwright E2E и runtime smoke Docker-образа (требуют живой
PostgreSQL). Последний раз оба подтверждены в
[снимке 2026-08-31](2026-08-31-release-readiness-inspection.md).

---

## 2. Устранённые блокеры

### 2.1 [BLOCKER] Гейт `check:theme` падал на HEAD

Обязательный шаг CI («Verify Theme Tokens»,
[`ci.yml`](../../../.github/workflows/ci.yml:47)) завершался ошибкой из-за
`#2563eb` в фикстуре
[`EquipmentWizardStepClassification.test.tsx`](../../../apps/web/src/components/eps/EquipmentWizardStepClassification.test.tsx:10).

**Разбор.** Значение — это поле `color` доменной сущности «метка
классификации», приходящее из БД, а не стиль в `sx={}`, который запрещает
[`ui_design_code.md`](../../../.agents/rules/ui_design_code.md) §2. При этом
[`check-theme-tokens.mjs`](../../../scripts/check-theme-tokens.mjs) **уже**
исключал каталоги `__tests__/`, но не файлы `*.test.tsx`, лежащие рядом с
модулем. Обе раскладки разрешены конвенцией
[`scripts/README.md`](../../../scripts/README.md), поэтому результат гейта
зависел от того, какую из них выбрал автор теста.

**Исправление.** Причина устранена в самом гейте, а не маскировкой symptom:
исключение распространено на `*.test.{ts,tsx,js,jsx}`. Правило для
production-кода не ослаблено — это проверено негативным тестом: временный
`#0284c7`, внедрённый в [`StatCard.tsx`](../../../apps/web/src/components/ui/StatCard.tsx),
гейт по-прежнему обнаруживает и падает.

### 2.2 [BLOCKER] Coverage gate реально падал на версии Node из `.nvmrc`

Первичный прогон на Node 22 показывал «PASS» и расхождение baseline, из чего
следовал ошибочный вывод «baseline устарел». Проверка на пиннутой версии
опровергла его.

**Разбор.** На Node 22 таблица покрытия включает и сами `*.test.ts` (277
строк-листьев против 174 на Node 24), из-за чего обе метрики завышаются:
line +≈6 п.п., reach +≈28 п.п. Реальное измерение на Node 24 при чистой
установке (`pnpm install --frozen-lockfile` в контейнере) дало **78.51 %**
при пороге 79 % — то есть на `ac1f3ce` шаг «Run Coverage Gate»
([`ci.yml`](../../../.github/workflows/ci.yml:92)) был красным. Значения
`Loaded files: 175` и `reach 47.17 %` при этом совпали с закоммиченным
baseline, что подтверждает: файл не устарел, а не соответствовал ему только
line-метрике.

**Исправление.** Порог не понижался (правило ratchet из
[`O0`](../../../plans/active/O0-coverage-roadmap.md)). Вместо этого добавлены
исполняемые тесты на три наименее покрытых модуля, и метрика поднята
78.51 % → **79.34 %**:

| Модуль | Было | Новый тест |
|---|---:|---|
| [`jira/notifications.ts`](../../../apps/web/src/lib/jira/notifications.ts) | 38.46 % | [`jira-notifications.test.ts`](../../../apps/web/src/lib/__tests__/jira-notifications.test.ts) |
| [`wms-transfers-service.ts`](../../../apps/web/src/lib/wms-transfers-service.ts) | 52.17 % | [`wms-transfers-service.test.ts`](../../../apps/web/src/lib/__tests__/wms-transfers-service.test.ts) |
| [`database-backup-service.ts`](../../../apps/web/src/lib/database-backup-service.ts) | 42.23 % | [`database-backup-create.test.ts`](../../../apps/web/src/lib/__tests__/database-backup-create.test.ts) |

Выбор модулей — по стоимости отказа, а не по объёму кода: молчаливая
неотправка уведомления об SLA, утечка чужого склада в выдачу перемещений и
отсутствие бэкапа при недоступном `pg_dump` не ловятся ни типами, ни UI.

---

## 3. Проверка качества самих тестов

Правило 7 из [`O0`](../../../plans/active/O0-coverage-roadmap.md) требует
убедиться, что тест краснеет при регрессии. Это не формальность: первая
версия `jira-notifications.test.ts` **проходила даже при переименовании
тестируемой функции**.

**Причина.** Логгер был замокан двумя специфаерами (`../logger` и
`@/lib/logger`) на один и тот же файл. `node:test` считает их разными
модулями и падает до регистрации subtests — набор отчитывался как один
«пройденный» тест, не выполнив ни одной проверки. Дубль удалён, поведение
зафиксировано комментарием в файле теста. После исправления набор корректно
показывает 9 subtests.

Каждый набор затем проверен мутациями production-кода:

| Мутация | Результат |
|---|---|
| SLA-проверка игнорирует `resolvedDate` | ✅ обнаружено |
| Удалён ранний `return` для некритичных заявок | ✅ обнаружено |
| Уведомление только первому получателю | ✅ обнаружено |
| Сужен список критичных приоритетов | ✅ обнаружено |
| Чужой склад не схлопывается в пустую выборку | ✅ обнаружено |
| Удалён shortcut для админа / явного склада | ✅ обнаружено |
| Нет fallback на Prisma при отказе `pg_dump` | ✅ обнаружено |
| Пароль БД попадает в argv | ✅ обнаружено |
| `schema`-режим использует флаги `--data-only` | ✅ обнаружено |

Все 13 мутаций приводят к падению тестов; production-код после каждой
проверки восстановлен (`git diff` пуст).

---

## 4. Устранённые замечания по безопасности и воспроизводимости

### 4.1 [HIGH] `.env.production` попадал в Docker build context

[`.dockerignore`](../../../.dockerignore) исключал `.env` и
`.env.production.local`, но **не** `.env.production` — файл, который
[`prod-deploy.sh`](../../../scripts/prod-deploy.sh:20) создаёт в корне
репозитория с реальными `JWT_SECRET` и паролем БД. При `COPY . .` в
[`Dockerfile`](../../../Dockerfile:30) секреты запекались бы в слой образа,
хотя в контейнер они передаются через `environment:` в
[`docker-compose.prod.yml`](../../../docker-compose.prod.yml:59).

**Исправление.** Исключено всё семейство `.env*` с явными исключениями для
шаблонов `*.example`. Проверено не регуляркой, а фактической сборкой образа:
в контекст попадает только `.env.production.example`, а `.env.production` и
`.env` — нет. Регрессия закрыта именованными политиками
`dockerignore-excludes-env-secrets` и `dockerignore-keeps-env-templates` в
[`check-static-security-policies.mjs`](../../../scripts/check-static-security-policies.mjs),
которые входят в `pnpm lint`.

### 4.2 [MEDIUM] Диапазон `engines` допускал версию, искажающую метрики

[`package.json`](../../../package.json:6) разрешал `>=22 <25`, тогда как
[`.nvmrc`](../../../.nvmrc) и [`Dockerfile`](../../../Dockerfile:9) требуют
Node 24. Именно это расхождение позволило получить локальный «PASS» при
красном CI (§2.2).

**Исправление.** Диапазон сужен до `>=24 <25`. Дополнительно
[`check-coverage.mjs`](../../../scripts/check-coverage.mjs) теперь печатает
явное предупреждение при запуске на поддерживаемой, но не baseline-версии, и
прямо запрещает коммитить перегенерированный на ней baseline. Node 22
намеренно оставлен в списке поддерживаемых, чтобы обычный `pnpm test`
оставался доступен, — ограничение касается только измерения покрытия.

---

## 5. Состояние, зафиксированное без изменений

Проверено против [`security.md`](../../../.agents/rules/security.md) и
[`universal.md`](../../../.agents/skills/code-reviewer/rules/universal.md).

| Требование | Статус |
|---|---|
| Rate limiting на всех роутах | ✅ 0 из 85 роутов без rate limit |
| Webhook fail-closed при настроенном секрете | ✅ Строгое `!providedToken \|\| !==` |
| Нет raw SQL | ✅ Только Prisma |
| Cookie `httpOnly` / `secure` / `sameSite` | ✅ Все три флага |
| Secrets в исходниках | ✅ Не обнаружено |
| `@ts-ignore` / `@ts-expect-error` | ✅ 0 в production-коде |
| `dangerouslySetInnerHTML` | ✅ 1 — SSR-инъекция стилей Emotion, не user input |
| CSP / security headers | ✅ `unsafe-eval` только в dev |
| Доверие `X-Forwarded-For` | ✅ Ограничено `TRUSTED_PROXY_COUNT` |

Роуты-исключения перепроверены вручную:
[`srm/webhooks/[id]`](../../../apps/web/src/app/api/srm/webhooks/[id]/route.ts:40)
(fail-closed, лимит тела 5 МБ, rate limit 60/мин) и
[`setup/execute`](../../../apps/web/src/app/api/setup/execute/route.ts:31)
(после установки требует админ-сессию, `PrismaClient` освобождается в
`finally`).

Упаковка: [`Dockerfile`](../../../Dockerfile) — multi-stage, non-root `USER node`,
healthcheck, fail-closed `migrate deploy` через `&&`;
[`docker-compose.prod.yml`](../../../docker-compose.prod.yml) — обязательные
секреты через `${VAR:?...}`, healthchecks, лимиты ресурсов;
[`nginx.conf`](../../../docker/nginx/nginx.conf) — security headers,
`server_tokens off`, rate/conn limiting.

---

## 6. Известные ограничения и технический долг

- **`SOLID violations` в `apps/web/src` равны порогу** (25 при `<= 25`):
  следующее нарушение уронит гейт. Значение выросло с 24 до 25 ещё до этой
  инспекции — закоммиченный `QUALITY_BASELINE.md` отставал от фактических
  метрик на `ac1f3ce` (проверено на чистом дереве). Отчёт перегенерирован.
- **Запас line-покрытия минимален**: 79.34 % при пороге 79 %. Поднимать
  ratchet сейчас нельзя — сначала нужен запас; зафиксировано как
  `BACKLOG-COV-01`. Метрика чувствительна и к правкам самих скриптов: файл
  [`check-coverage.mjs`](../../../scripts/check-coverage.mjs) покрыт тестом
  парсера, поэтому добавленные в него строки сами понижают процент.
- **Reach 47.17 %** далёк от целевых 65 % строки «После O7»: 196 из 371
  production-файла не загружаются Node-тестами.
- **124 использования `any`** в production-коде — накопленный долг типизации
  (существующий backlog-пункт `D`).
- **`take: 1000`** при сопоставлении оборудования в SRM-вебхуке — заведён как
  `BACKLOG-SRM-01`.
- В [`plans/active/`](../../../plans/active) остаются `N9`, `O0`, `O7`;
  у `O7` не закрыты три пункта Definition of Done.

---

## 7. Итог

Оба блокирующих дефекта устранены в корне, а не обходом: гейт тем-токенов
приведён в соответствие с конвенцией расположения тестов, покрытие поднято
реальными тестами без снижения порога. Закрыт вектор утечки production-секретов
в образ и устранена причина расхождения локальных и CI-измерений.

Перед развёртыванием остаются штатные операционные условия: замена
плейсхолдеров из [`.env.production.example`](../../../.env.production.example),
TLS на внешнем ingress, проверенный backup/restore, migration baseline для баз
до версионных миграций и прогон Playwright E2E на среде с PostgreSQL — см.
[`PRODUCTION_DEPLOYMENT.md`](../../operations/PRODUCTION_DEPLOYMENT.md).
