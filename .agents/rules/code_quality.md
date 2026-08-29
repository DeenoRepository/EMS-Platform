# Стандарты качества кода — EMS-Platform

> Обновлено: 2026-08-29 (повторная инспекция)
> Инструмент: `.agents/skills/code-reviewer/scripts/code_quality_checker.py`
> Текущий балл: apps/web — **79.4/100 (C)**, packages — **94.1/100 (A)**; `node scripts/check-quality-baseline.mjs` PASS

---

## 1. Обязательные метрики качества

| Метрика | Порог | Действие |
|---|---|---|
| Длина функции | **> 50 строк** | Обязательная декомпозиция |
| Цикломатическая сложность | **> 10** | Обязательный рефакторинг |
| Размер файла | **> 500 строк** | Разбить на модули |
| Количество параметров функции | **> 5** | Передать как объект-конфиг |
| Глубина вложенности | **> 4 уровня** | Early return / извлечение функций |
| Оценка файла | **F (0-49/100)** | Рефакторинг до слияния в main |

---

## 2. Запуск проверки качества

```bash
# Анализ всего фронтенда (TypeScript)
python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --recursive --language typescript

# Проверка baseline без сохранения сгенерированных JSON-отчётов
node scripts/check-quality-baseline.mjs

# Анализ пакетов
python .agents/skills/code-reviewer/scripts/code_quality_checker.py packages --recursive --language typescript

# Анализ конкретного файла
python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src/lib/jira-service.ts --language typescript
```

---

## 3. Файлы с оценкой F — Приоритеты рефакторинга

По состоянию на 2026-08-29 quality baseline для web: average **79.4**, F-grade **36**, SOLID violations **25**. Packages: average **94.1**, F-grade **0**, SOLID violations **0**. Ниже приведены актуальные P1/P2 кандидаты; список не является разрешением на массовый рефакторинг.

| Файл | Проблема | Приоритет |
|---|---|---|
| `apps/web/src/app/setup/page.tsx` | крупный setup flow; steps уже вынесены частично | P1/P2 |
| `apps/web/src/app/eps/[id]/page.tsx` | крупный passport flow; tabs/dialogs и lifecycle mapping вынесены частично | P1/P2 |
| `apps/web/src/app/wms/warehouses/page.tsx` | submit complexity 18 | P1/P2 |
| `apps/web/src/app/srm/page.tsx` | page orchestration и details drawer | P1/P2 |
| `apps/web/src/app/wms/page.tsx` | dashboard fetch/stats orchestration | P1/P2 |
| `apps/web/src/components/layout/Sidebar.tsx` | осторожно: collapsed flyout и permission gating | P1/P2 |
| `apps/web/src/components/mro/MroExecutionWizardDialog.tsx` | wizard orchestration | P2 |
| `apps/web/src/components/wms/WmsOperationWizardDialog.tsx` | wizard orchestration | P2 |

---

## 4. Декомпозиция jira-service.ts (P2)

`apps/web/src/lib/jira-service.ts` (1060 строк) должен быть разбит на:

```
apps/web/src/lib/srm/
  ├── jira-field-mapper.ts      ← applyJiraFieldMapping(), extractValueByPath(), transformValue()
  ├── jira-sync.ts              ← syncJiraIssues(), getJiraFieldMapping(), saveJiraFieldMapping()
  ├── srm-metrics.ts            ← calculateSrmMetrics(), calculateAdvancedRamsMetrics()
  └── srm-notifications.ts     ← notifySrmIncident(), createInternalServiceRequest()
```

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
// ❌ Magic numbers (нарушение из jira-service.ts)
const downtimeHours = downtimeMs / 1000 / 3600;
const slaScore = Math.min(100, (resolved / total) * 100);

// ✅ Именованные константы
const MS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;
const MAX_SLA_SCORE = 100;

const downtimeHours = downtimeMs / MS_PER_SECOND / SECONDS_PER_HOUR;
const slaScore = Math.min(MAX_SLA_SCORE, (resolved / total) * MAX_SLA_SCORE);
```

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

**Исключение**: `any` допустим только в типах для legacy-интеграций с внешними API (Jira, Redmine) где схема нестабильна. Для новых response boundaries сначала использовать `unknown`, затем локальный type guard или Zod-схему.

Текущие bounded improvements Phase D: GitLab и Redmine `testConnection()` responses уже narrowed из `unknown` через локальные guards; не расширять это изменение до массовой миграции всех JSON boundaries.

Текущие bounded improvements Phase D: GitLab и Redmine `testConnection()` responses уже narrowed из `unknown` через локальные guards; не расширять это изменение до массовой миграции всех JSON boundaries.

---

## 8. Обработка ошибок — Стандарт

```typescript
// ✅ Корректная обработка в API-роутах
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[MODULE_NAME] Ошибка:', message);
  return NextResponse.json(
    { success: false, error: 'Описание ошибки для пользователя', details: message },
    { status: 500 }
  );
}

// ❌ ЗАПРЕЩЕНО — потеря типа ошибки
} catch (error: any) {   // ← 'any' скрывает тип
  console.error(error);  // ← раскрытие внутреннего стека пользователю
  return NextResponse.json({ error: error.message }, { status: 500 }); // ← утечка деталей
}
```

---

## 9. Тесты — Обязательные требования

* Минимальное покрытие для новых модулей в `packages/auth/` — 90%
* Тесты должны находиться рядом с кодом или в `src/lib/__tests__/`
* Перед коммитом: `pnpm test` должен показать **0 failures**

```bash
# Запуск всех тестов
pnpm test

# Ожидаемый результат:
# tests 113+
# pass  113+
# fail  0
```

---

## 10. Предварительная проверка перед коммитом

```bash
# 1. Запустить тесты
pnpm test

# 2. Проверить качество изменённых файлов
python .agents/skills/code-reviewer/scripts/code_quality_checker.py <path_to_changed_files> --language typescript

# 3. Проверить baseline без сохранения сгенерированных JSON-файлов
node scripts/check-quality-baseline.mjs

# 4. Убедиться, что нет непреднамеренных F-grade regressions и ошибок форматирования
git diff --check

# 5. Сделать git commit (Conventional Commits)
git add <files>
git commit -m "feat|fix|refactor|docs|test|chore: описание"
```

`quality-web.json`, `quality-packages.json` и `docs/code-review-report.json` не являются обязательными артефактами и не должны коммититься.
