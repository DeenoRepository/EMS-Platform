# EMS-Platform — инспекция покрытия тестами (снимок 2026-08-31)

> **Неизменяемый снимок.** Фиксирует состояние тестовой инфраструктуры
> на дату инспекции. Актуальные вычисляемые метрики качества здесь не
> дублируются: см. [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md) и
> [`plans/README.md`](../../../plans/README.md).

**Дата:** 2026-08-31
**Скилл:** [`senior-qa`](../../../.agents/skills/senior-qa/SKILL.md)
**Правила:** [`AGENTS.md`](../../../AGENTS.md),
[`code_quality.md`](../../../.agents/rules/code_quality.md)

> **Вердикт: ⚠️ Тестовый гейт даёт ложную уверенность.**
> `pnpm test` зелёный (193/193), но реально исполняется **11.7 %** файлов
> кодовой базы. Гейт не смог бы поймать регрессию в 92.7 % строк кода.
> Найдено 3 дефекта самой инфраструктуры, из них 1 blocker: 8 тестовых
> файлов (31 проверка) физически не запускаются никогда.

---

## 1. Как измерялось

Все числа воспроизводимы. Предусловие — `pnpm install --frozen-lockfile`
и `pnpm db:generate` (см. «Подготовка окружения» в
[`AGENTS.md`](../../../AGENTS.md)).

```bash
# 1. Прогон текущего гейта
pnpm test

# 2. Реальное покрытие через нативный механизм Node 22
DATABASE_URL="postgresql://d:d@localhost:5432/d?schema=public" \
node --experimental-test-module-mocks --experimental-test-coverage \
     --import tsx --test \
     $(find packages/auth/src apps/web/src/lib/__tests__ -name '*.test.ts')
```

Отчёт `--experimental-test-coverage` показывает **только те файлы, которые
были загружены** хотя бы одним тестом. Файл, который не импортировали
никогда, в отчёт не попадает вовсе — поэтому итоговая строка
`all files | 80.25 %` **не является покрытием проекта**. Истинный
знаменатель восстановлен обходом файловой системы.

---

## 2. Фактическое состояние

| Показатель | Значение |
|---|---:|
| Тестовых файлов на диске (юнит) | 36 |
| Из них реально исполняется `pnpm test` | 28 |
| **Тестовых файлов, не исполняемых никогда** | **8** |
| Проверок (`test`/`it`) на диске | 224 |
| Проверок фактически выполняется | 193 |
| Производственных файлов (`.ts`/`.tsx`, без тестов и `.d.ts`) | 366 |
| Из них загружается хотя бы одним тестом | 43 |
| **Файлов с нулевым покрытием** | **323 (88.3 %)** |
| Строк кода всего | 67 367 |
| **Строк, не исполняемых ни одним тестом** | **62 459 (92.7 %)** |
| Покрытие по строкам среди *загруженных* файлов | 80.25 % |
| **Истинный охват по файлам** | **11.7 %** |

### Разрез по типам кода

| Область | Всего | Без покрытия |
|---|---:|---:|
| API-роуты (`app/api/**/route.ts`) | 85 | 85 (100 %) |
| React-компоненты (`.tsx`) | 178+ | 178 (100 %) |
| E2E-сценарии (Playwright) | 9 проверок | не в CI |

Ни один из **85** API-роутов не имеет теста. Из них **49** выполняют
операции записи (`create`/`update`/`delete`/`upsert`), **9** используют
`$transaction`.

---

## 3. Находки

### 3.1 [BLOCKER] 8 тестовых файлов никогда не запускаются

[`scripts/test-runner.mjs:27-30`](../../../scripts/test-runner.mjs:27)
собирает файлы жёстким списком из **двух** директорий:

```js
const testFiles = [
  ...findTestFiles(path.join('packages', 'auth', 'src')),
  ...findTestFiles(path.join('apps', 'web', 'src', 'lib', '__tests__')),
];
```

Всё, что лежит вне этих путей, молча игнорируется. Тесты, написанные
рядом с проверяемым кодом (как того требует story-практика проекта),
попадают в «слепую зону»:

| Файл | Проверок |
|---|---:|
| [`api/eps/approvals/get-query.test.ts`](../../../apps/web/src/app/api/eps/approvals/get-query.test.ts) | 3 |
| [`api/eps/equipment/get-query.test.ts`](../../../apps/web/src/app/api/eps/equipment/get-query.test.ts) | 3 |
| [`api/eps/history/get-query.test.ts`](../../../apps/web/src/app/api/eps/history/get-query.test.ts) | 4 |
| [`setup/ldap-auth-result.test.ts`](../../../apps/web/src/app/setup/ldap-auth-result.test.ts) | 4 |
| [`wms/warehouses/warehouse-submit.test.ts`](../../../apps/web/src/app/wms/warehouses/warehouse-submit.test.ts) | 4 |
| [`components/layout/sidebar-load-data.test.ts`](../../../apps/web/src/components/layout/sidebar-load-data.test.ts) | 4 |
| [`lib/eps-import-helpers.test.ts`](../../../apps/web/src/lib/eps-import-helpers.test.ts) | 5 |
| [`lib/system-settings-builder.test.ts`](../../../apps/web/src/lib/system-settings-builder.test.ts) | 4 |

Это **31 проверка**, написанная в рамках закрытых story (`K4.4`, `K4.6`,
`K4.7`, `K4.8`, `K4.9`, `K4.1`, `K4.2`, `K4.3`). Они были приняты как
Definition of Done, но никогда не выполнялись. Любая из них может быть
сломана прямо сейчас — гейт этого не покажет.

**Особая опасность:** story-практика проекта поощряет класть тест рядом с
кодом. Каждая следующая story будет наступать на ту же мину.

### 3.2 [HIGH] Нет измерения покрытия — регрессия охвата невидима

Ни `c8`/`nyc`/`istanbul`, ни `--experimental-test-coverage` нигде не
подключены (проверено по `package.json` всех пакетов и
[`test-runner.mjs`](../../../scripts/test-runner.mjs)). В
[`ci.yml`](../../../.github/workflows/ci.yml) 12 гейтов — покрытия среди
них нет.

Следствие: в проекте, где 8 других метрик качества жёстко зафиксированы
порогами в
[`check-quality-baseline.mjs`](../../../scripts/check-quality-baseline.mjs),
покрытие — единственная неизмеряемая характеристика. Удаление любого
теста не будет замечено ни одним гейтом.

### 3.3 [MEDIUM] Тавтологические тесты: проверяется копия логики

Часть тестов не импортирует production-код, а **переопределяет логику
внутри самого теста** и проверяет собственную копию. Такой тест зелёный
всегда, независимо от состояния приложения.

Подтверждённые случаи:

* [`packages/auth/src/eps-import.test.ts`](../../../packages/auth/src/eps-import.test.ts) —
  объявляет локальные `normalizeHeader()`, `matchColumn()`,
  `validateImportRow()` и константы `KNOWN_BASE_RULES`. Ни одного импорта
  из приложения. При этом реальная реализация существует в
  [`apps/web/src/lib/eps-import-matcher.ts`](../../../apps/web/src/lib/eps-import-matcher.ts)
  и покрыта нулём тестов.
* [`packages/auth/src/mro.test.ts`](../../../packages/auth/src/mro.test.ts) —
  локальная `validateChecklistCompletion()`.
* [`packages/auth/src/wms.test.ts`](../../../packages/auth/src/wms.test.ts) —
  6 локальных функций.
* [`lib/__tests__/backup-script.test.ts`](../../../apps/web/src/lib/__tests__/backup-script.test.ts) —
  0 production-импортов.

Такие тесты дают вклад в счётчик «193 passing», но нулевой вклад в
защиту от регрессий. Они документируют намерение, а не поведение.

### 3.4 [MEDIUM] E2E не входит в CI

[`playwright.config.ts`](../../../apps/web/playwright.config.ts) и 9
smoke-проверок (`login`, `module-access`, `equipment-create`) существуют
после story `L4`, но `test:e2e` не вызывается ни в одном шаге
[`ci.yml`](../../../.github/workflows/ci.yml). Набор деградирует без
регулярного прогона.

Причина объективна: требуется живой PostgreSQL и `pnpm build`. Это
решается сервисным контейнером в workflow, а не отказом от запуска.

### 3.5 Почему тестов на роуты нет — и почему это устранимо

Гипотеза «роуты Next.js нельзя протестировать юнит-тестом» проверена
экспериментально и **опровергнута**. Прямой импорт
[`api/feedback/route.ts`](../../../apps/web/src/app/api/feedback/route.ts)
падает с `Cannot find module '@/lib/auth-guard'`: `tsx`, запущенный из
корня монорепозитория, читает корневой `tsconfig.json` и не видит
`paths` из [`apps/web/tsconfig.json`](../../../apps/web/tsconfig.json).

Достаточно указать нужный конфиг:

```bash
TSX_TSCONFIG_PATH=apps/web/tsconfig.json \
  node --experimental-test-module-mocks --import tsx --test <файл>
```

Проверено: тест, импортирующий `GET` из `api/feedback/route.ts` с
подменённым через `mock.module('@ems/database')` Prisma, проходит и
корректно получает `401` для неаутентифицированного запроса. Барьер —
одна переменная окружения, а не архитектурное ограничение.

---

## 4. План

Работы разбиты на 6 story фазы **M**, см.
[`plans/README.md`](../../../plans/README.md). Порядок обязателен: `M1`
и `M2` создают возможность измерять результат, без них остальные
story не проверяемы.

| ID | Задача | Приоритет |
|---|---|---|
| `M1` | Runner обнаруживает все тесты; 31 «мёртвая» проверка оживает | P0 |
| `M2` | Измерение покрытия + порог в CI | P0 |
| `M3` | Тесты API-роутов: RBAC, rate-limit, валидация (риск-приоритет) | P1 |
| `M4` | Устранить тавтологические тесты | P1 |
| `M5` | E2E в CI с сервисным PostgreSQL | P2 |
| `M6` | Компонентное тестирование React | P3 |

### Целевые пороги

Пороги задаются «храповиком» (не понижать достигнутое), а не разовым
скачком до 80 % — последнее в кодовой базе на 67 k строк недостижимо без
массы бессодержательных тестов.

| Этап | Охват файлов | Строки (среди загруженных) |
|---|---:|---:|
| Сейчас | 11.7 % | 80.25 % |
| После `M1`+`M2` | ~15 % | ≥ 80 % (зафиксировано) |
| После `M3` | ~35 % | ≥ 80 % |
| После `M6` | ~50 % | ≥ 80 % |

---

## 5. Вывод

Качество *написанных* тестов высокое: `mock.module`-изоляция от Prisma в
[`auth-guard.test.ts`](../../../apps/web/src/lib/__tests__/auth-guard.test.ts)
и fail-closed проверка webhook в
[`api-security.test.ts`](../../../apps/web/src/lib/__tests__/api-security.test.ts)
— образцовые. Проблема не в качестве, а в **охвате и в достоверности
гейта**.

Ключевой риск не «мало тестов», а то, что зелёный `pnpm test`
интерпретируется как «регрессий нет», хотя гейт не касается 92.7 % кода
и молча игнорирует 8 тестовых файлов. Сначала следует починить
измерение (`M1`, `M2`), и только потом наращивать покрытие.
