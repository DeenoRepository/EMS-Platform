# EMS-Platform — инспекция готовности к production (снимок 2026-08-31)

> **Неизменяемый снимок.** Фиксирует состояние ветки `main` на исходном HEAD
> `085f8fc`. Актуальные вычисляемые метрики находятся в
> [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md),
> [`COVERAGE_BASELINE.md`](../COVERAGE_BASELINE.md) и
> [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md).

**Дата:** 2026-08-31  
**Ветка / исходный HEAD:** `main` / `085f8fc`  
**Среда проверки:** Windows 11, Node.js 24.15.0, pnpm 11.16.0, Docker 29.4.3, Docker Compose 5.1.4  
**Правила:** [`AGENTS.md`](../../../AGENTS.md),
[`security.md`](../../../.agents/rules/security.md),
[`code_quality.md`](../../../.agents/rules/code_quality.md)

> **Вердикт: ❌ NO-GO. В текущем состоянии ветку нельзя выпускать в production.**
>
> Два обязательных CI/release-гейта красные: production build не завершается,
> а quality baseline превышает разрешённое число code smells. Дополнительно
> production runbook ссылается на отсутствующие deploy-скрипты, TLS в поставляемом
> Nginx-конфиге не настроен, а наблюдаемость не имеет формализованных SLO и
> метрик. Unit, component, coverage, security, dependency и Compose-проверки
> проходят, но они не компенсируют невозможность собрать релизный артефакт.

---

## 1. Результаты проверок

| Проверка | Результат | Оценка |
|---|---|---|
| Точная версия Node.js из [`.nvmrc`](../../../.nvmrc) | Node.js 24.15.0 | ✅ PASS |
| `pnpm install --frozen-lockfile` | Lockfile согласован | ✅ PASS |
| `pnpm db:generate` | Prisma Client 6.19.3 сгенерирован | ✅ PASS |
| TypeScript `tsc --noEmit` | Ошибок типов нет | ✅ PASS |
| Dependency audit (`high`) | Известных уязвимостей нет | ✅ PASS |
| Theme-token gate | Hex-цветов вне разрешённых файлов нет | ✅ PASS |
| Documentation links | 119 файлов, битых ссылок нет | ✅ PASS |
| ESLint CLI с локальными security rules | Нарушений нет | ✅ PASS |
| Static security policies | PASS | ✅ PASS |
| Route security audit | 85 routes; 0 без rate limit; 0 sensitive gaps | ✅ PASS с ручными исключениями |
| Node test suite | 58 файлов, 342 проверки, 0 падений | ✅ PASS |
| React component suite | 6 файлов, 38 тестов, 0 падений | ✅ PASS |
| Coverage gate | Все три текущих ratchet-порога пройдены | ✅ PASS |
| Prisma schema validation | Schema valid | ✅ PASS |
| Production Compose config | Валиден с `.env.production.example` | ✅ PASS |
| Offline Compose config | Валиден с `.env.production.example` | ✅ PASS |
| Production build | Next.js compilation проходит, lint phase падает | ❌ BLOCKER |
| Quality baseline | Code smells выше порога | ❌ BLOCKER |
| Playwright E2E | Не запущен: production build отсутствует | ⚠️ NOT EXECUTED |
| Production image/runtime smoke | Не выполнялся: Dockerfile зависит от красного `pnpm build` | ⚠️ BLOCKED |

---

## 2. Блокирующие находки

### 2.1 [BLOCKER] Production build падает из-за недоступных локальных ESLint rules

[`apps/web/package.json`](../../../apps/web/package.json) запускает обычный lint
через ESLint CLI с `--rulesdir ../../scripts/eslint-rules`, поэтому отдельный
`pnpm lint` зелёный. Однако [`next build`](../../../apps/web/package.json)
запускает встроенную lint-фазу Next.js без этого CLI-параметра. Конфигурация
[`apps/web/.eslintrc.json`](../../../apps/web/.eslintrc.json) включает четыре
локальных правила по именам:

- `no-console-in-api-routes`;
- `require-rate-limit-on-sensitive-routes`;
- `require-safe-error-response`;
- `require-route-security-guards`.

На build-фазе определения правил не загружаются, и Next.js выдаёт
`Definition for rule ... was not found` для API-файлов. Компиляция JavaScript
успевает завершиться, но production build возвращает код 1. Это блокирует:

1. обязательный CI job `validate`;
2. Playwright E2E, который запускается только после production build;
3. сборку production Docker image, где [`Dockerfile`](../../../Dockerfile)
   выполняет `pnpm build`;
4. любой воспроизводимый release artifact.

**Требуемое исправление:** сделать security rules доступными одинаково для
ESLint CLI и Next.js build. Предпочтительный путь — оформить локальные правила
как загружаемый ESLint plugin/config либо отключить встроенный lint Next.js
только при условии, что отдельный обязательный `pnpm lint` остаётся CI-гейтом.
После исправления обязательны повторные `pnpm build`, Playwright E2E и Docker
runtime smoke.

### 2.2 [BLOCKER] Quality baseline регрессировал и превышает порог

Перегенерированный [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md) фиксирует
красный общий гейт. В `apps/web/src` число code smells превышает разрешённый
порог. Одновременно увеличились объём анализируемого frontend-кода и число
F-grade файлов относительно закоммиченного baseline.

Это обязательный CI шаг в [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml),
поэтому ветка не может пройти merge/release pipeline. Порог нельзя повышать
только ради зелёного CI: требуется определить новые регрессировавшие файлы,
устранить достаточное число smells и заново сгенерировать baseline.

---

## 3. Высокие операционные риски

### 3.1 [HIGH] Production runbook ссылается на отсутствующие deploy-скрипты

[`PRODUCTION_DEPLOYMENT.md`](../../operations/PRODUCTION_DEPLOYMENT.md) и
[`scripts/README.md`](../../../scripts/README.md) предлагают запускать
`scripts/prod-deploy.sh` и `scripts/prod-deploy.ps1`, но таких файлов в
репозитории нет. Прямая команда Docker Compose документирована и валидна,
однако основной «автоматический» путь развёртывания приведёт к ошибке file not
found.

**Требуемое исправление:** либо вернуть и проверить оба deploy-скрипта, либо
удалить ложный путь из документации и объявить `docker compose -f
docker-compose.prod.yml ...` единственным поддерживаемым способом.

### 3.2 [HIGH] HTTPS объявлен, но поставляемый Nginx-конфиг слушает только HTTP

[`docker-compose.prod.yml`](../../../docker-compose.prod.yml) публикует 443 и
монтирует каталог сертификатов. Runbook требует «раскомментировать» TLS-секцию,
но в [`docker/nginx/nginx.conf`](../../../docker/nginx/nginx.conf) нет ни
`listen 443 ssl`, ни `ssl_certificate`, ни HTTP→HTTPS redirect. Порт 443 в
текущем образе фактически не обслуживается.

Кроме того, Next.js устанавливает HSTS для всех ответов через
[`next.config.mjs`](../../../apps/web/next.config.mjs), включая HTTP. До
реального включения TLS это может закрепить неверное ожидание HTTPS у клиента.

**Требуемое исправление:** добавить проверенный TLS server block или явно
перенести TLS termination на внешний ingress/load balancer; согласовать HSTS с
реальной точкой завершения TLS и добавить smoke-проверку HTTPS.

### 3.3 [HIGH] Нет формализованных SLO и production telemetry

В проекте есть readiness endpoint и структурированный logger, но не обнаружены:

- целевые SLO/uptime;
- API latency targets p50/p95/p99;
- frontend budgets LCP/INP/CLS;
- exporter метрик, tracing или error aggregation;
- документированный alert routing.

Для production-решения необходимо зафиксировать хотя бы минимальные проверяемые
цели. Рекомендуемый стартовый профиль для single-instance внутренней системы:

- API latency: p50 ≤ 200 ms, p95 ≤ 800 ms, p99 ≤ 1500 ms для обычных CRUD API;
- mobile-4G frontend: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1;
- availability SLO: ≥ 99.5% в месяц, отдельно исключая согласованные окна ТО.

Это рекомендуемые исходные цели, а не измеренные текущие показатели. Перед
релизом владелец продукта и эксплуатации должен утвердить их либо заменить
организационными значениями и подключить измерение/алерты.

---

## 4. Средние риски и ограничения

### 4.1 [MEDIUM] Абсолютный охват тестами остаётся низким

[`COVERAGE_BASELINE.md`](../COVERAGE_BASELINE.md) проходит текущий ratchet, но
большинство production-файлов не загружается Node test suite. Component line
coverage также остаётся очень низким по абсолютной величине. Это означает, что
гейт защищает от дальнейшего падения, но не доказывает достаточное покрытие
критических пользовательских потоков.

До production рекомендуется как минимум повторно выполнить E2E после починки
build и расширить обязательный smoke на login/logout, EPS create/approval,
WMS write lifecycle, MRO execution и RBAC denial.

### 4.2 [MEDIUM] Rate limiter рассчитан на один экземпляр

[`plans/BACKLOG.md`](../../../plans/BACKLOG.md) корректно фиксирует, что текущий
in-memory store подходит только для single-instance deployment. Production
Compose поднимает один `ems-web`, поэтому текущая конфигурация допустима. Любое
горизонтальное масштабирование требует общего Redis-backed store до запуска
нескольких экземпляров.

### 4.3 [MEDIUM] Docker runner содержит полный workspace install

[`Dockerfile`](../../../Dockerfile) копирует весь builder workspace в runner,
включая лишние build/dev зависимости. Это увеличивает image size и поверхность
атаки. После устранения блокеров рекомендуется перейти на Next.js standalone
output или production-only runtime dependency set.

### 4.4 [MEDIUM] Документация Node.js устарела относительно обязательной версии

Production и baremetal runbooks разрешают Node.js 18/20/22, тогда как
репозиторий закреплён на Node.js 24.15.0 через [`.nvmrc`](../../../.nvmrc), а
coverage воспроизводим только на проверенных major. Release bundle и
операционные инструкции должны использовать одну поддерживаемую runtime
матрицу.

---

## 5. Подтверждённые сильные стороны

- Секреты в production Compose обязательны, небезопасные fallback credentials
  запрещены статическим гейтом.
- Versioned Prisma migration baseline присутствует; startup не подавляет
  ошибку `migrate deploy`.
- Health endpoint проверяет доступность БД и запись в storage, скрывая детальную
  диагностику от неавторизованных запросов.
- Все 85 API route-файлов имеют rate limiting; чувствительных route без limiter
  не найдено.
- Unit/domain/RBAC/security suite полностью зелёный.
- Dependency audit не обнаружил high/critical известных уязвимостей.
- Production/offline Compose синтаксически валидны.
- Backup scripts завершаются ненулевым кодом при провале дампа и не удаляют
  старые копии после неуспешного backup.

---

## 6. Минимальный план выхода на GO

1. Исправить загрузку локальных ESLint rules в production build.
2. Устранить quality regression до прохождения текущего baseline без повышения
   порогов.
3. Выполнить полный CI-equivalent набор: lint, quality, tests, coverage, build.
4. Выполнить Playwright E2E на чистой ephemeral PostgreSQL.
5. Собрать production Docker image и выполнить runtime smoke: migrations,
   readiness, upload write, fail-closed старт на несовместимой БД.
6. Исправить отсутствующие deploy scripts или production runbook.
7. Настроить и проверить TLS termination; только после этого включать HSTS в
   фактическом production path.
8. Утвердить SLO/performance targets и подключить минимальные метрики/алерты.
9. Перед выкладкой: задать реальные secrets, создать backup, проверить restore
   в отдельной среде и документировать rollback через восстановление БД.

## 7. Итоговый release decision

**NO-GO до устранения пунктов 2.1 и 2.2 и повторного прохождения build/E2E/image
smoke.** Операционные пункты 3.1–3.3 должны быть закрыты или формально приняты
владельцем production-среды до предоставления пользователям промышленного
доступа.
