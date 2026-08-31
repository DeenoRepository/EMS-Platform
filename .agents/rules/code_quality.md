# Стандарты качества кода — EMS-Platform

> Обновлено: 2026-08-30 (структурная реорганизация отчётности)
> Инструмент: `.agents/skills/code-reviewer/scripts/code_quality_checker.py`
>
> **Текущие фактические метрики (score, F-grade, smells, SOLID) здесь не
> публикуются.** Единственный источник — генерируемый файл
> [`docs/quality/QUALITY_BASELINE.md`](../../docs/quality/QUALITY_BASELINE.md)
> (`node scripts/check-quality-baseline.mjs --report`). Любое число,
> скопированное из него в этот файл, устареет при следующей регенерации —
> не копируйте, а ссылайтесь.
>
> Список F-grade файлов с разбором находок — в последнем снимке инспекции в
> [`docs/quality/inspections/`](../../docs/quality/inspections/).
> Активная работа по декомпозиции — в [`plans/active/`](../../plans/active/)
> (см. `plans/PHASE-I-NOTES.md` для стоп-файлов и известных false-positive).

---

## 1. Обязательные метрики качества (пороги — нормативные, не факт)

| Метрика | Порог | Действие |
|---|---|---|
| Длина функции | **> 50 строк** | Обязательная декомпозиция |
| Цикломатическая сложность | **> 10** | Обязательный рефакторинг |
| Размер файла | **> 500 строк** | Разбить на модули |
| Количество параметров функции | **> 5** | Передать как объект-конфиг |
| Глубина вложенности | **> 4 уровня** | Early return / извлечение функций |
| Оценка файла | **F (0-49/100)** | Рефакторинг до слияния в main |

Пороги quality baseline (average score, максимум F-grade файлов, code
smells, SOLID violations) заданы **только** в
[`scripts/check-quality-baseline.mjs`](../../scripts/check-quality-baseline.mjs)
— это единственный источник истины для их значений. Не дублировать эти
числа здесь.

---

## 2. Запуск проверки качества

```bash
# Анализ всего фронтенда (TypeScript)
python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --recursive --language typescript

# Проверка baseline (консоль) без сохранения сгенерированных JSON-отчётов
node scripts/check-quality-baseline.mjs

# Проверка baseline И регенерация docs/quality/QUALITY_BASELINE.md
node scripts/check-quality-baseline.mjs --report

# Анализ пакетов
python .agents/skills/code-reviewer/scripts/code_quality_checker.py packages --recursive --language typescript

# Анализ конкретного файла
python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src/lib/wms-operations-service.ts --language typescript

# Детальный список F-grade файлов (для сверки перед story)
python scripts/fgrade_detail.py
```

---

## 3. Приоритизация рефакторинга

**Приоритет — по реальной цикломатической сложности (`cx`), а не по
score.** Низкий score у presentation-файла обычно вызван объёмом разметки
и несёт минимальный риск; высокий `cx` в серверной бизнес-логике —
реальный риск порчи данных.

Порядок:

1. Сначала — бизнес-логика на сервере (API routes, серверные сервисы) с
   высоким `cx`.
2. Затем — чистые функции в UI (сортировщики, валидаторы, обработчики) с
   высоким `cx`.
3. В последнюю очередь — размер presentation-файлов при низком `cx`
   (разметка, а не ветвление).

Текущий список F-grade файлов с разбором по каждому пункту — в последнем
снимке [`docs/quality/inspections/`](../../docs/quality/inspections/), не
здесь: этот список устаревает при каждой декомпозиции и дублирование двух
копий (здесь и в снимке) — именно то, что привело к рассинхронизации
2026-08-30.

### Известные ограничения инструмента

`code_quality_checker.py` некорректно определяет границы функций в TSX —
может приписать handler'у весь последующий render-блок (сотни строк).
Score — индикатор тренда, а не приговор. **Перед любым рефакторингом
сверяйте реальные границы функций через `read_file`.**

Известные false-positive файлы (0 распознанных функций — не рефакторить
ради score) перечислены в
[`plans/PHASE-I-NOTES.md`](../../plans/PHASE-I-NOTES.md).

---

## 4. Пример эталонной декомпозиции сервисного слоя

`apps/web/src/lib/jira-service.ts` был разделён на focused-модули в
`apps/web/src/lib/srm/` с сохранением compatibility barrel:

```
apps/web/src/lib/srm/
  ├── jira-field-mapper.ts      ← applyJiraFieldMapping(), extractValueByPath(), transformValue()
  ├── jira-sync.ts              ← syncJiraIssues(), getJiraFieldMapping(), saveJiraFieldMapping()
  ├── srm-metrics.ts            ← calculateSrmMetrics(), calculateAdvancedRamsMetrics()
  └── srm-notifications.ts      ← notifySrmIncident(), createInternalServiceRequest()
```

Тот же рецепт (public props/callbacks зафиксированы → чистая логика в
`*.ts` рядом → presentation в соседние компоненты → state/fetching остаётся
у route owner) применялся во всех историях `plans/done/2026-08/C*`.

---

## 5. Паттерны для длинных функций

### Early Return (вместо глубокой вложенности):
```typescript
// ❌ Глубокая вложенность (нарушение > 4 уровней)
async function processRequest(req: NextRequest) {
  const user = await getUser(req);
  if (user) {
    const data = await getData();
    if (data) {
      if (data.isValid) {
        // ... логика на 4-м уровне
      }
    }
  }
}

// ✅ Early return
async function processRequest(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return unauthorizedResponse();

  const data = await getData();
  if (!data) return notFoundResponse();
  if (!data.isValid) return badRequestResponse('Невалидные данные');

  // ... логика на 1-м уровне
}
```

### Объект-конфиг вместо множества параметров:
```typescript
// ❌ Более 5 параметров
async function createEquipment(name: string, type: string, location: string,
  responsible: string, status: string, inventoryNumber: string) { ... }

// ✅ Объект-конфиг
interface CreateEquipmentDto {
  name: string;
  type: string;
  location: string;
  responsible: string;
  status: string;
  inventoryNumber: string;
}
async function createEquipment(dto: CreateEquipmentDto) { ... }
```

---

## 6. Именованные константы вместо magic numbers

```typescript
// ❌ Magic numbers
const downtimeHours = downtimeMs / 1000 / 3600;
const slaScore = Math.min(100, (resolved / total) * 100);

// ✅ Именованные константы
const MS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;
const MAX_SLA_SCORE = 100;

const downtimeHours = downtimeMs / MS_PER_SECOND / SECONDS_PER_HOUR;
const slaScore = Math.min(MAX_SLA_SCORE, (resolved / total) * MAX_SLA_SCORE);
```

**Не выполнять массовую замену magic numbers** — именовать только
domain-константы (лимиты, таймауты, пороги SLA). Основная масса code
smells — layout-константы (`sx={{ mb: 2 }}`, `fontSize: 14`) и не подлежат
переименованию.

---

## 7. TypeScript — Запрет `any`

```typescript
// ❌ ЗАПРЕЩЕНО в production-коде
const data: any = await req.json();
const authConfig: any = integration.authConfig;

// ✅ Типизированные интерфейсы
interface AuthConfig {
  webhookSecret?: string;
  apiToken?: string;
  apiKey?: string;
  token?: string;
}
const auth = (integration.authConfig as AuthConfig) || {};
```

**Исключение**: `any` допустим только в типах для legacy-интеграций с
внешними API (Jira, Redmine) где схема нестабильна. Для новых response
boundaries сначала использовать `unknown`, затем локальный type guard или
Zod-схему. Оставшийся объём этой работы — см.
[`plans/BACKLOG.md`](../../plans/BACKLOG.md), item `D`: выполнять по одной
границе за раз, не массовой миграцией.

---

## 8. Обработка ошибок — Стандарт

```typescript
// ✅ Корректная обработка в API-роутах
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error('[MODULE_NAME] Ошибка', { error: message });
  return NextResponse.json(
    { success: false, error: 'Описание ошибки для пользователя', details: message },
    { status: 500 }
  );
}

// ❌ ЗАПРЕЩЕНО — потеря типа ошибки и утечка деталей
} catch (error: any) {   // ← 'any' скрывает тип
  console.error(error);  // ← console вместо structured logger
  return NextResponse.json({ error: error.message }, { status: 500 }); // ← утечка деталей
}
```

---

## 9. Тесты — Обязательные требования

* Минимальное покрытие для новых модулей в `packages/auth/` — 90%
* Тесты должны находиться рядом с кодом или в `src/lib/__tests__/`
* Перед коммитом: `pnpm test` должен показать **0 failures**
* Актуальный счётчик тестов и время прогона — вывод самой команды, не
  фиксировать здесь числом (устареет при первом же новом тесте).

### 9.1 Запрет тавтологических тестов (no-local-logic rule)

**Тавтологический тест** — тестовый файл, который объявляет локальную копию
бизнес-логики вместо того, чтобы импортировать её из продакшн-модуля.
Такой тест всегда зелёный, так как проверяет сам себя, а не реальный код.

❌ **Запрещено:**
```typescript
// test-file.test.ts — локальная функция вместо импорта
function processStockIssue(qty: number, issue: number) {
  // копия логики из route.ts
  if (issue > qty) throw new Error('Недостаточно остатка');
  return qty - issue;
}
test('deducts stock', () => { assert.equal(processStockIssue(10, 3), 7); });
```

✅ **Обязательно:**
```typescript
// test-file.test.ts — импорт реального модуля
import { processStockIssue } from '../wms-operations-service';
test('deducts stock', () => { assert.equal(processStockIssue(10, 3), 7); });
```

**Правила:**
* Тест **обязан** импортировать хотя бы один символ из тестируемого продакшн-модуля.
* Если нужная функция не экспортируется — сначала экспортируй её из продакшн-кода,
  затем пиши тест.
* Если функции в продакшн-коде нет совсем — заведи задачу в
  [`plans/BACKLOG.md`](../../plans/BACKLOG.md) и **не пиши тест** на локальную копию.
* Вспомогательные функции теста (`makeRequest`, `makeMock`, `buildFixture` и т.д.)
  разрешены, если они не содержат бизнес-логику тестируемого домена.
* Нарушение обнаруживается при code-review: ищи `function` внутри `describe/test`
  с именами, совпадающими с понятиями домена (process*, calculate*, validate*, reconcile*).

```bash
pnpm test
```

---

## 10. Предварительная проверка перед коммитом

```bash
# 1. Запустить тесты
pnpm test

# 2. Проверить качество изменённых файлов
python .agents/skills/code-reviewer/scripts/code_quality_checker.py <path_to_changed_files> --language typescript

# 3. Проверить baseline (без перегенерации docs/quality/QUALITY_BASELINE.md)
node scripts/check-quality-baseline.mjs

# 4. Убедиться, что нет непреднамеренных F-grade regressions и ошибок форматирования
git diff --check

# 5. Если добавлена/закрыта story — регенерировать индекс планов
node scripts/plans-index.mjs

# 6. Сделать git commit (Conventional Commits)
git add <files>
git commit -m "feat|fix|refactor|docs|test|chore: описание"
```

`quality-web.json`, `quality-packages.json` не являются обязательными
артефактами и не должны коммититься.
[`docs/quality/QUALITY_BASELINE.md`](../../docs/quality/QUALITY_BASELINE.md)
и [`plans/README.md`](../../plans/README.md), напротив, **коммитятся** —
это отслеживаемые генерируемые файлы, обновляемые явным запуском скрипта,
а не побочным эффектом каждого прогона тестов.
