# Стандарты качества кода — EMS-Platform

> Обновлено: 2026-08-27 (по результатам code quality audit)  
> Инструмент: `.agents/skills/code-reviewer/scripts/code_quality_checker.py`  
> Исторический балл аудита 2026-08-27: apps/web — **72.8/100 (C)**, packages — **89.3/100 (B+)**. Это не результат проверки текущей ревизии.
>
> Перед изменениями прочитать [правила безопасных изменений](safe_changes.md). Пороги не разрешают массовый рефакторинг вне задачи или развитие выводимых SRM/MRO. Проверить наличие инструмента и его параметры перед запуском; отсутствие инструмента сообщать как ограничение.

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
python3 .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --recursive --language typescript

# JSON-отчёт для CI
python3 .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --recursive --language typescript --json > docs/code-review-report.json

# Анализ пакетов
python3 .agents/skills/code-reviewer/scripts/code_quality_checker.py packages --recursive --language typescript

# Анализ конкретного файла
python3 .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src/lib/jira-service.ts --language typescript
```

---

## 3. Файлы с оценкой F — Приоритеты рефакторинга

Исторические наблюдения 2026-08-27, требующие перепроверки. Приоритет текущей задачи и сохранность данных определяются [планом перехода](../../docs/SRM_MRO_RETIREMENT_MODULARIZATION_PLAN.md), а не этой таблицей:

| Файл | Проблема | Приоритет |
|---|---|---|
| [Сервис прототипа SRM](../../apps/web/src/lib/jira-service.ts) | Исторический долг; не развивать ради оценки | Вывод по согласованному плану |
| `apps/web/src/app/setup/page.tsx` | >1500 строк, монолитный компонент | P3 |
| `apps/web/src/app/eps/[id]/page.tsx` | >1500 строк, монолитный компонент | P3 |
| `apps/web/src/app/eps/page.tsx` | >1100 строк | P3 |
| `apps/web/src/app/eps/approvals/page.tsx` | >1200 строк | P3 |
| `apps/web/src/components/eps/SmartImportWizard.tsx` | Большой компонент | P3 |
| `apps/web/src/components/wms/WmsOperationWizardDialog.tsx` | Большой компонент | P3 |

---

## 4. Вывод прототипов вместо их декомпозиции

Старое требование декомпозировать Jira-сервис отменено. SRM/MRO — прототипы. По явной задаче на их вывод сначала проверить потребителей, сохранить данные и необходимые исторические контракты, затем удалить активную реализацию. Общую полезную утилиту переносить только при подтвержденном потребителе и вместе с тестами. Не создавать новые SRM-пакеты ради старого аудита.

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

**Исключение**: `any` допустим только в типах для legacy-интеграций с внешними API (Jira, Redmine) где схема нестабильна.

---

## 8. Обработка ошибок — Стандарт

```typescript
// ✅ Корректная обработка в API-роутах
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[MODULE_NAME] Ошибка:', message);
  return NextResponse.json(
    { success: false, error: 'Описание ошибки для пользователя' },
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
* Тесты принадлежат реализации и находятся рядом с ней или в тестовом каталоге соответствующего пакета. Пакет авторизации не должен импортировать приложение ради доменных тестов.
* Тестировать реальные функции и сценарии, а не заново написанные внутри теста симуляции. Проверки транзакций и конкурентности требуют изолированной БД.
* Проверить, что новые тесты включены в реальную команду CI. Число тестов в примере ниже историческое, не критерий приемки.
* Перед коммитом кода выполнить применимые тесты, lint, проверку типов и сборку. Зафиксировать baseline ошибок; не ослаблять проверки. Для документационных изменений достаточно проверки diff, ссылок и содержания. Невыполненные проверки явно перечислить.

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
python3 .agents/skills/code-reviewer/scripts/code_quality_checker.py <path_to_changed_files> --language typescript

# 3. Убедиться что нет файлов с оценкой F в изменённых файлах

# 4. Сделать git commit (Conventional Commits)
git add <files>
git commit -m "feat|fix|refactor|docs|test|chore: описание"
```
