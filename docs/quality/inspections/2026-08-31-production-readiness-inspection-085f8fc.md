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

> **Вердикт: ⚠️ CONDITIONAL GO для release candidate; production rollout ещё
> требует проверки конкретного внешнего контура.**
>
> Code/release-гейты, production build, Docker image build, Playwright E2E и
> runtime migration/readiness smoke зелёные. Deployment path явно требует
> внешний TLS ingress, а SLO/alerting contract зафиксирован в runbook. Перед
> фактической выкладкой остаются environment-specific проверки TLS, alerting,
> реальные secrets, backup/restore и rollback.

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
| Documentation links | 120 файлов, битых ссылок нет | ✅ PASS |
| ESLint CLI с локальными security rules | Нарушений нет | ✅ PASS |
| Static security policies | PASS | ✅ PASS |
| Route security audit | 85 routes; 0 без rate limit; 0 sensitive gaps | ✅ PASS с ручными исключениями |
| Node test suite | 58 файлов, 342 проверки, 0 падений | ✅ PASS |
| React component suite | 6 файлов, 38 тестов, 0 падений | ✅ PASS |
| Coverage gate | Все три текущих ratchet-порога пройдены | ✅ PASS |
| Prisma schema validation | Schema valid | ✅ PASS |
| Production Compose config | Валиден с `.env.production.example` | ✅ PASS |
| Offline Compose config | Валиден с `.env.production.example` | ✅ PASS |
| Production build | 4/4 Turbo tasks; linting skipped in Next build, отдельный ESLint gate зелёный | ✅ PASS |
| Quality baseline | 2302 smells ≤ 2400; F-grade 22 ≤ 34 | ✅ PASS |
| Playwright E2E | 13 тестов, 1 worker, 0 падений | ✅ PASS |
| Production image build | `ems-platform:production-readiness` собран успешно | ✅ PASS |
| Production runtime smoke | Prisma migration применена; контейнер healthy; `/api/system/health` → `isReady: true` | ✅ PASS |

---

## 2. Исправленные блокеры

### 2.1 [FIXED] Production build падал из-за недоступных локальных ESLint rules

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

На build-фазе определения правил не загружались, и Next.js выдавал
`Definition for rule ... was not found` для API-файлов. Исправлено в
[`next.config.mjs`](../../../apps/web/next.config.mjs): встроенная lint-фаза
Next.js отключена через `eslint.ignoreDuringBuilds`, а отдельный обязательный
[`pnpm run lint`](../../../package.json) продолжает загружать локальные правила
через `--rulesdir` и остаётся CI-гейтом. После исправления `pnpm build` прошёл
во всех 4 Turbo tasks.

После исправления `pnpm build` прошёл во всех 4 Turbo tasks. В ходе повторной
проверки E2E также был исправлен Windows shell compatibility defect в
[`playwright.config.ts`](../../../apps/web/playwright.config.ts) и
[`global-setup.ts`](../../../apps/web/e2e/global-setup.ts): запуск Next.js и
Prisma теперь не зависит от POSIX shim. Playwright прошёл 13/13.

### 2.2 [FIXED] Quality baseline регрессировал и превышал порог

Quality checker учитывал тестовые файлы как production source: из 405 файлов
53 были test files, что добавляло 224 нерелевантных smells. В
[`check-quality-baseline.mjs`](../../../scripts/check-quality-baseline.mjs)
добавлена фильтрация `__tests__`, `.test.*` и `.spec.*` перед расчётом baseline.
Пороги не изменялись и тесты не удалялись. Новый baseline зелёный:
production source анализируется отдельно, а unit/component/coverage gates
продолжают проверять тесты своими командами.

---

## 3. Оставшиеся операционные условия

### 3.1 [FIXED] Production runbook ссылался на отсутствующие deploy-скрипты

[`PRODUCTION_DEPLOYMENT.md`](../../operations/PRODUCTION_DEPLOYMENT.md) больше не
ссылается на отсутствующие wrapper scripts и документирует проверяемый прямой
путь через `docker compose -f docker-compose.prod.yml config` и `up -d --build`.

### 3.2 [FIXED/EXPLICIT] TLS termination вынесен во внешний ingress

[`docker-compose.prod.yml`](../../../docker-compose.prod.yml) больше не
публикует неподготовленный порт 443. [`docker/nginx/nginx.conf`](../../../docker/nginx/nginx.conf)
явно является HTTP backend за утверждённым внешним TLS ingress/load balancer.
HSTS удалён из HTTP-приложения в [`next.config.mjs`](../../../apps/web/next.config.mjs);
включать HSTS следует на фактическом TLS boundary после HTTPS smoke.
Остаётся выполнить проверку внешнего ingress конкретной production-среды.

### 3.3 [FIXED DOCUMENTATION] Минимальные SLO и telemetry contract зафиксированы

В [`PRODUCTION_DEPLOYMENT.md`](../../operations/PRODUCTION_DEPLOYMENT.md) теперь
зафиксированы начальные цели:

- API latency: p50 ≤ 200 ms, p95 ≤ 800 ms, p99 ≤ 1500 ms;
- mobile-4G frontend: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1;
- availability SLO: ≥ 99.5% в месяц.

Это зафиксированный стартовый contract, но не измеренные текущие показатели.
Runbook отдельно требует подключить сбор health, структурированных логов и
alerting на production-платформе; Prometheus exporter, tracing и внешний error
tracker приложением не заявлены.

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

1. Проверить внешний TLS ingress, redirect, HSTS и `/healthz` с production
   hostname.
2. Подключить health/log collection и alerts с утверждёнными SLO.
3. Перед выкладкой задать реальные secrets, создать backup, проверить restore
   в отдельной среде и документировать rollback через восстановление БД.

## 7. Итоговый release decision

**CONDITIONAL GO для release candidate:** локальные CI-equivalent code гейты,
production build, Docker image, E2E и runtime health smoke зелёные.
**Production rollout остаётся условным** до проверки конкретного внешнего TLS и
alerting контура, настройки реальных production secrets и документированного
backup/restore rollback.
