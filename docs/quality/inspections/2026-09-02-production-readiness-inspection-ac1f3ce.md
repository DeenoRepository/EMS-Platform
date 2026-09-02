# EMS-Platform — инспекция готовности к продакшену (снимок 2026-09-02)

> **Неизменяемый снимок.** Фиксирует состояние ветки на HEAD `ac1f3ce`.
> Актуальные вычисляемые метрики находятся в
> [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md),
> [`COVERAGE_BASELINE.md`](../COVERAGE_BASELINE.md) и
> [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md).

**Дата:** 2026-09-02
**Ветка / HEAD:** `ac1f3ce` («test: закрыть O6 domain forms and wizards coverage»)
**Рабочее дерево:** чистое (`git status --porcelain` пуст)
**Скилл:** [`code-reviewer`](../../../.agents/skills/code-reviewer/SKILL.md)
**Правила:** [`universal.md`](../../../.agents/skills/code-reviewer/rules/universal.md),
[`typescript.md`](../../../.agents/skills/code-reviewer/languages/typescript.md),
[`AGENTS.md`](../../../AGENTS.md)

> **Вердикт: ⚠️ Request changes — релиз блокируется двумя дефектами гейтов.**
> Код, сборка, безопасность и упаковка готовы: production build, 609 unit-тестов,
> component-тесты, quality baseline, route audit и dependency audit зелёные.
> Однако **CI на этом коммите упадёт**: обязательный шаг `check:theme` падает, а
> сгенерированный `COVERAGE_BASELINE.md` разошёлся с фактическими метриками.
> Оба дефекта — гигиена гейтов, а не дефекты продукта, и устраняются малыми
> правками.

---

## 1. Результаты релизных гейтов

Проверки выполнены в порядке шагов [`ci.yml`](../../../.github/workflows/ci.yml).

| Проверка | Итог |
|---|---|
| `pnpm db:generate` | ✅ PASS (Prisma Client 6.19.3) |
| `pnpm audit --audit-level=high` | ✅ No known vulnerabilities |
| TypeScript `tsc --noEmit` | ✅ PASS |
| **`pnpm check:theme`** | ❌ **FAIL — 1 hardcoded hex** |
| `pnpm check:docs` | ✅ PASS (143 файла) |
| `pnpm lint` (ESLint + static security policies) | ✅ PASS |
| `pnpm check:quality` | ✅ PASS (обе области) |
| `node scripts/plans-index.mjs --check` | ✅ PASS |
| `check-quality-baseline.mjs --report` + `git diff` | ✅ Без расхождений |
| `route_audit.py --report` + `git diff` | ✅ Без расхождений |
| `pnpm test` | ✅ PASS — 609 тестов, 166 suites, 102 файла, 0 fail |
| `pnpm --filter @ems/web test:components` | ✅ PASS (Vitest + RTL) |
| `check-coverage.mjs` (пороги) | ✅ PASS — 85.77 / 74.93 / 38.6 |
| **`COVERAGE_BASELINE.md` + `git diff --exit-code`** | ❌ **FAIL — baseline устарел** |
| Production build (`pnpm build`, NODE_ENV=production) | ✅ PASS — 4/4 Turbo tasks, ~2m03s |

Не выполнялось в этой инспекции: Playwright E2E (требует живой PostgreSQL и
Chromium) и реальный runtime smoke Docker-образа. Последний раз оба
подтверждены в [снимке 2026-08-31](2026-08-31-release-readiness-inspection.md).

---

## 2. Блокирующие дефекты

### 2.1 [BLOCKER] Гейт `check:theme` падает на HEAD

[`check-theme-tokens.mjs`](../../../scripts/check-theme-tokens.mjs) — обязательный
шаг CI («Verify Theme Tokens»,
[`ci.yml`](../../../.github/workflows/ci.yml:47)), и он завершается ошибкой:

```
[UI Design Code] apps/web/src/components/eps/EquipmentWizardStepClassification.test.tsx:10
  - Hardcoded hex color: #2563eb
❌ Found 1 hardcoded color usages outside approved theme definition files.
```

Источник — тестовая фикстура в
[`EquipmentWizardStepClassification.test.tsx`](../../../apps/web/src/components/eps/EquipmentWizardStepClassification.test.tsx:10),
введённая коммитом `39ae85c`. Значение `#2563eb` — это поле `color` доменной
сущности «метка классификации» (данные, приходящие из БД), а не стиль
UI-компонента. То есть нарушение формальное: запрет из
[`ui_design_code.md`](../../../.agents/rules/ui_design_code.md) нацелен на
хардкод цветов в `sx={}`, а не на тестовые данные.

Тем не менее гейт красный, и в этом состоянии PR не сливается. Это также
означает, что коммиты `39ae85c`…`ac1f3ce` были влиты без прогона полного
локального набора проверок.

**Рекомендация.** Не ослаблять правило. Заменить фикстуру на
семантически нейтральное значение либо расширить исключения скрипта на
тестовые фикстуры доменных данных — осознанным решением, зафиксированным в
самом скрипте.

### 2.2 [BLOCKER] `COVERAGE_BASELINE.md` не соответствует фактическому покрытию

CI проверяет сгенерированный отчёт через `git diff --exit-code`
([`ci.yml`](../../../.github/workflows/ci.yml:92)). Регенерация даёт
существенное расхождение с закоммиченным файлом:

| Метрика | В репозитории | Фактически | Порог |
|---|---:|---:|---:|
| Line coverage (loaded) | 79.27 % | **85.77 %** | 79 % |
| File-level coverage (reach) | 47.17 % | **74.93 %** | 47 % |
| Файлов загружено тестами | 175 | **278** | — |
| Файлов с нулевым покрытием | 196 (52.8 %) | **93 (25.1 %)** | — |

Расхождение — не деградация, а **незафиксированное улучшение**: работы O5/O6
подняли reach со 175 до 278 файлов, но `--report` после этого не перегенерирован.
Гейт покрытия при этом проходит, потому что фактические значения выше порогов.

**Рекомендация.** Выполнить `node scripts/check-coverage.mjs --report` и
закоммитить обновлённый baseline на той же мажорной версии Node, что указана
в [`.nvmrc`](../../../.nvmrc).

---

## 3. Значимые замечания (не блокирующие)

### 3.1 [HIGH] `.env.production` не исключён из Docker build context

[`.dockerignore`](../../../.dockerignore:25) исключает `.env`,
`.env.production.local` и прочие варианты, но **не** `.env.production`. При этом
именно этот файл является штатным носителем production-секретов: его создаёт
[`prod-deploy.sh`](../../../scripts/prod-deploy.sh:20) в корне репозитория,
подставляя сгенерированные `JWT_SECRET` и пароль БД.

[`Dockerfile`](../../../Dockerfile:30) выполняет `COPY . .` в builder-слой, а
затем runner копирует `/app` целиком. Следовательно, на хосте, где уже
выполнялся `prod-deploy.sh`, сборка образа **запечёт реальные секреты в слой
образа**. Секреты передаются в контейнер через `environment:` в
[`docker-compose.prod.yml`](../../../docker-compose.prod.yml:59), поэтому файл
внутри образа не нужен ни для чего.

Риск реализуется при публикации образа в registry или передаче offline-бандла.
`.gitignore` защищает только git, но не Docker context.

**Рекомендация.** Добавить `.env.production` (и `.env.*`, кроме `*.example`) в
[`.dockerignore`](../../../.dockerignore).

### 3.2 [MEDIUM] Версия Node в окружении инспекции не совпадала с `.nvmrc`

[`.nvmrc`](../../../.nvmrc) фиксирует `24.15.0`;
[`Dockerfile`](../../../Dockerfile:9) использует `node:24-alpine`. В окружении
инспекции доступен только Node `v22.22.1` (nvm отсутствует), что укладывается в
`engines: >=22 <25` из [`package.json`](../../../package.json:6), но противоречит
явному требованию [`AGENTS.md`](../../../AGENTS.md) запускать coverage-гейт на
версии из `.nvmrc`.

Все прогоны в этой инспекции выполнены на Node 22. Абсолютные значения покрытия
могут незначительно отличаться от CI из-за формата экспериментального отчёта
покрытия Node. Пороговые выводы (PASS/FAIL) от этого не меняются, а расхождение
baseline из §2.2 имеет структурную природу (175 → 278 файлов), а не
версионную.

**Рекомендация.** Сузить `engines` до мажорной версии 24 либо задокументировать,
что диапазон намеренно шире, чем поддерживаемая для гейтов версия.

### 3.3 [LOW] Порог покрытия отстал от достигнутых значений (ratchet)

[`check-coverage.mjs`](../../../scripts/check-coverage.mjs:25) держит пороги
79 / 47 / 25 при фактических 85.77 / 74.93 / 38.6. По правилу ratchet из
[`O0`](../../../plans/active/O0-coverage-roadmap.md) пороги должны подниматься
отдельным коммитом после фактического достижения. Сейчас между фактом и полом
запас в 28 п.п. по reach — регрессия такого масштаба пройдёт незамеченной.

Целевая строка «После O7» — 82 / 65 / 25 — уже фактически превышена по всем трём
метрикам.

### 3.4 [LOW] Незакрытые story фазы O

В [`plans/active/`](../../../plans/active) три открытые story: `N9`, `O0`, `O7`.
У [`O7`](../../../plans/active/O7-e2e-flow-coverage.md) не отмечены три пункта
Definition of Done, включая тройной прогон полного набора из 50 E2E-тестов и
подъём порогов. Это подтверждает §3.3 и означает, что стабильность полного
E2E-набора формально ещё не доказана, хотя набор уже расширен до 14 spec-файлов.

---

## 4. Проверка соответствия правилам безопасности

Проверено против [`security.md`](../../../.agents/rules/security.md) и
[`universal.md`](../../../.agents/skills/code-reviewer/rules/universal.md).

| Требование | Статус |
|---|---|
| Rate limiting на всех роутах | ✅ 0 из 85 роутов без rate limit |
| Чувствительные роуты без rate limit | ✅ 0 |
| Webhook fail-closed при настроенном секрете | ✅ Подтверждено вручную |
| Нет raw SQL | ✅ Только Prisma |
| Cookie `httpOnly` / `secure` / `sameSite` | ✅ Все три флага выставлены |
| Secrets в исходниках | ✅ Не обнаружено; в шаблонах — плейсхолдеры |
| `@ts-ignore` / `@ts-expect-error` | ✅ 0 в production-коде |
| `dangerouslySetInnerHTML` | ✅ 1 — SSR-инъекция стилей Emotion, не user input |
| CSP / security headers | ✅ Заданы; `unsafe-eval` только в dev |
| Доверие `X-Forwarded-For` | ✅ Ограничено `TRUSTED_PROXY_COUNT`, документировано |

**Роуты-исключения перепроверены вручную и подтверждены как корректные:**

* [`srm/webhooks/[id]`](../../../apps/web/src/app/api/srm/webhooks/[id]/route.ts:40) —
  fail-closed: при отсутствии секрета и без явного `allowUnsigned` возвращает
  401; при наличии секрета сравнение строгое (`!providedToken || !==`), как
  требует [`AGENTS.md`](../../../AGENTS.md). Есть лимит тела 5 МБ и rate limit
  60/мин на интеграцию.
* [`setup/execute`](../../../apps/web/src/app/api/setup/execute/route.ts:31) —
  после установки требует сессию администратора; признак установки берётся из
  `resolveInstallState()` с fail-closed при недоступности БД; rate limit 3/10 мин;
  `PrismaClient` освобождается в `finally`.
* `auth/login` — публичный по назначению.

Замечание по правилу «Performance» из universal-набора: в webhook-обработчике
[`prisma.equipment.findMany({ take: 1000 })`](../../../apps/web/src/app/api/srm/webhooks/[id]/route.ts:81)
загружает до 1000 записей на каждое событие для сопоставления оборудования.
Запрос ограничен и не является N+1, но при росте парка оборудования сопоставление
станет неполным (обрежется на 1000). Стоит вынести в отдельную задачу как
функциональный риск, а не как дефект производительности.

---

## 5. Качество кода и упаковка

Quality baseline зелёный в обеих областях; значения не дублируются здесь —
источник истины [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md). Отмечу лишь
близость к потолку: `SOLID violations` в `apps/web/src` равны порогу
(25 при `<= 25`) — следующее нарушение уронит гейт.

Прочие наблюдения:

* `TODO`/`FIXME`/`HACK` в production-коде: **0**.
* `eslint-disable` в production-коде: 5 — точечные, гейт зелёный.
* `any` / `as any` в production-коде: 124 вхождения. Правило
  [`typescript.md`](../../../.agents/skills/code-reviewer/languages/typescript.md)
  требует явного обоснования каждого; это накопленный технический долг типизации,
  не блокирующий релиз.
* Страниц `app/**/page.tsx`: 27; E2E spec-файлов: 14.

Упаковка и деплой проверены статически:

* [`Dockerfile`](../../../Dockerfile) — multi-stage, non-root `USER node`,
  healthcheck, `migrate deploy` перед стартом с fail-closed через `&&`.
* [`docker-compose.prod.yml`](../../../docker-compose.prod.yml) — обязательные
  секреты через `${VAR:?...}`, healthchecks, `depends_on: service_healthy`,
  лимиты ресурсов, именованные volume.
* [`nginx.conf`](../../../docker/nginx/nginx.conf) — security headers,
  `server_tokens off`, rate/conn limiting, TLS вынесен на внешний ingress
  (задокументировано).

---

## 6. Итог и порядок действий

Продукт готов к продакшену по существу: сборка, миграции, безопасность,
упаковка и тестовый набор в порядке, регрессий относительно снимка 2026-08-31
не выявлено, покрытие существенно выросло. Блокирует релиз только гигиена
гейтов на текущем коммите.

**Перед релизом (обязательно):**

1. Починить `check:theme` — §2.1.
2. Перегенерировать и закоммитить `COVERAGE_BASELINE.md` — §2.2.
3. Добавить `.env.production` в `.dockerignore` — §3.1.
4. Прогнать полный CI-эквивалент на Node из `.nvmrc`, включая Playwright.

**Ближайшие задачи после релиза:**

5. Поднять пороги покрытия до фактических значений — §3.3.
6. Закрыть Definition of Done в `O7` либо перенести незакрытые пункты — §3.4.
7. Ограничение `take: 1000` в SRM-webhook — §4.
8. Сузить `engines` до Node 24 — §3.2.

**Операционные условия релиза** (не изменились с прошлого снимка): замена всех
плейсхолдеров из [`.env.production.example`](../../../.env.production.example),
TLS на внешнем ingress, проверенный backup/restore и migration baseline для
баз, созданных до версионных миграций — см.
[`PRODUCTION_DEPLOYMENT.md`](../../operations/PRODUCTION_DEPLOYMENT.md).
