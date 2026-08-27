# EMS-Platform — План устранения замечаний аудита

> **Источник:** [`docs/CODE_REVIEW_AUDIT.md`](docs/CODE_REVIEW_AUDIT.md) (аудит 2026-08-27)  
> **Для агента:** Code mode (senior-frontend + senior-backend skills)  
> **Версия правил:** AGENTS.md 2.0  
> **Общий объём:** ~3–5 рабочих дней

---

## Инструкции для агента

1. Выполнять задачи **строго по приоритетам** (P1 → P2 → P3).
2. После каждой задачи — **git commit** с тегом `fix:` или `refactor:`.
3. При работе с UI — использовать **только** `theme.palette.*` и семантические токены. Hex-цвета запрещены.
4. При замене `<Chip>` на `<StatusBadge>` — проверить существующие `status`-пропы в [`StatusBadge.tsx`](apps/web/src/components/ui/StatusBadge.tsx) и добавить новые статусы при необходимости.
5. Перед декомпозицией функций — прочитать файл целиком, чтобы понять контекст.
6. Загрузить скилл `zero-hallucination-coder` перед каждой крупной задачей.

---

## ПРИОРИТЕТ 1 — КРИТИЧЕСКИЙ (Security + Grade F)

### Задача P1-1: Добавить RBAC в `/api/users`

**Файл:** [`apps/web/src/app/api/users/route.ts`](apps/web/src/app/api/users/route.ts)  
**Проблема:** Любой аутентифицированный пользователь (включая `guest`) получает полный список пользователей с `ldapLogin`, `email` и ролями.  
**Трудозатраты:** 30 минут

**Конкретные изменения:**

```typescript
// Добавить импорты в начало файла:
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { forbiddenResponse } from '@/lib/auth-guard';

// После строки if (!user) return unauthorizedResponse(); добавить:
if (
  !hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) &&
  !hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW) &&
  !hasPermission(user, PERMISSIONS.MRO_SCHEDULE_VIEW) &&
  !hasPermission(user, PERMISSIONS.SRM_DASHBOARD_VIEW) &&
  !user.roles.includes('admin')
) {
  return forbiddenResponse('Недостаточно прав для просмотра списка пользователей');
}
```

**Коммит:** `fix(api): add RBAC permission check to GET /api/users to prevent org structure leak`

---

### Задача P1-2: Добавить Rate Limiting на admin test-эндпоинты

**Файлы:**
- [`apps/web/src/app/api/admin/settings/test-ldap/route.ts`](apps/web/src/app/api/admin/settings/test-ldap/route.ts)
- [`apps/web/src/app/api/admin/settings/test-srm/route.ts`](apps/web/src/app/api/admin/settings/test-srm/route.ts)
- [`apps/web/src/app/api/admin/settings/test-jira/route.ts`](apps/web/src/app/api/admin/settings/test-jira/route.ts)

**Трудозатраты:** 1 час

**Конкретные изменения (для каждого файла):**

```typescript
// Добавить импорт:
import { enforceRateLimit } from '@/lib/rate-limit';

// Первая строка в каждом POST-обработчике:
export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { 
    limit: 5, 
    windowMs: 60 * 1000, 
    prefix: 'admin-test-ldap'  // уникальный prefix для каждого
  });
  if (rateLimitError) return rateLimitError;
  // ... остальной код
}
```

**Префиксы:** `admin-test-ldap`, `admin-test-srm`, `admin-test-jira`

**Коммит:** `fix(security): add rate limiting to admin test endpoints (ldap/srm/jira)`

---

### Задача P1-3: Декомпозиция `renderCustomFieldValue()` — выделить в компонент

**Файл:** [`apps/web/src/app/eps/[id]/page.tsx`](apps/web/src/app/eps/%5Bid%5D/page.tsx)  
**Текущее состояние:** функция 1 495 строк, сложность 102  
**Трудозатраты:** 1 рабочий день

**Алгоритм действий:**

1. Прочитать функцию `renderCustomFieldValue()` (строки ~630–2125)
2. Выделить логику в новый файл: [`apps/web/src/components/eps/CustomFieldValueRenderer.tsx`](apps/web/src/components/eps/CustomFieldValueRenderer.tsx)
3. Компонент принимает пропы: `field: CustomFieldDefinition` и `value: unknown`
4. Внутри компонента разбить по типам полей: `TEXT`, `NUMBER`, `DATE`, `BOOLEAN`, `SELECT`, `MULTISELECT`, `LINK`, `PHONE`, `EMAIL`, `TEXTAREA` — каждый тип в отдельный вспомогательный компонент или функцию внутри файла
5. В исходном файле заменить тело функции на:
   ```typescript
   import { CustomFieldValueRenderer } from '@/components/eps/CustomFieldValueRenderer';
   // ...
   // Вместо renderCustomFieldValue(f, val):
   <CustomFieldValueRenderer field={f} value={val} />
   ```
6. Добавить экспорт в [`apps/web/src/components/eps/index.ts`](apps/web/src/components/eps/index.ts)

**Структура нового файла:**
```typescript
// apps/web/src/components/eps/CustomFieldValueRenderer.tsx
interface Props {
  field: { key: string; name: string; type: string; unit?: string; options?: string[] };
  value: unknown;
}

// Вспомогательные компоненты:
function TextFieldValue({ value }: { value: string }) { ... }
function NumberFieldValue({ value, unit }: { value: number; unit?: string }) { ... }
function DateFieldValue({ value }: { value: string }) { ... }
function BooleanFieldValue({ value }: { value: boolean }) { ... }
function SelectFieldValue({ value }: { value: string }) { ... }
// ...

export function CustomFieldValueRenderer({ field, value }: Props) {
  switch (field.type) {
    case 'TEXT': return <TextFieldValue value={String(value ?? '')} />;
    case 'NUMBER': return <NumberFieldValue value={Number(value)} unit={field.unit} />;
    // ...
    default: return <Typography variant="body2">{String(value ?? '—')}</Typography>;
  }
}
```

**Коммит:** `refactor(eps): extract renderCustomFieldValue into CustomFieldValueRenderer component`

---

### Задача P1-4: Декомпозиция `handleBulkPrint()` — выделить в хук

**Файл:** [`apps/web/src/app/eps/page.tsx`](apps/web/src/app/eps/page.tsx)  
**Текущее состояние:** функция 1 167 строк, сложность 95  
**Трудозатраты:** 1 рабочий день

**Алгоритм действий:**

1. Прочитать функцию `handleBulkPrint()` целиком
2. Создать хук: [`apps/web/src/hooks/useBulkPrint.ts`](apps/web/src/hooks/useBulkPrint.ts)
3. Создать утилиту генерации HTML-документа: [`apps/web/src/lib/equipment-print-template.ts`](apps/web/src/lib/equipment-print-template.ts)
4. В утилите выделить функции:
   - `generateEquipmentPassportHtml(equipment, options)` → строка HTML
   - `generateBarcodeSection(equipment)` → строка HTML
   - `generateQrSection(equipment)` → строка HTML
   - `openPrintWindow(html: string)` → void
5. В хуке:
   ```typescript
   export function useBulkPrint(selectedIds: string[]) {
     const [isPrinting, setIsPrinting] = useState(false);
     
     const handleBulkPrint = useCallback(async (options: PrintOptions) => {
       setIsPrinting(true);
       try {
         const equipment = await fetchEquipmentForPrint(selectedIds);
         const html = equipment.map(eq => generateEquipmentPassportHtml(eq, options)).join('');
         openPrintWindow(html);
       } finally {
         setIsPrinting(false);
       }
     }, [selectedIds]);
     
     return { handleBulkPrint, isPrinting };
   }
   ```
6. В `eps/page.tsx` заменить inline-код на вызов хука

**Коммит:** `refactor(eps): extract handleBulkPrint into useBulkPrint hook and equipment-print-template util`

---

### Задача P1-5: Декомпозиция `handleProcessReview()` в approvals

**Файл:** [`apps/web/src/app/eps/approvals/page.tsx`](apps/web/src/app/eps/approvals/page.tsx)  
**Текущее состояние:** функция 923 строки, сложность 74  
**Трудозатраты:** 0.5 дня

**Алгоритм действий:**

1. Прочитать `handleProcessReview()` и выявить логические блоки
2. Разбить на следующие функции:
   - `buildApprovalRequestBody(formState)` → данные для API
   - `handleApprovalStatusChange(approvalId, status, comment)` → API-вызов статуса
   - `handleEquipmentStatusSync(equipmentId, newStatus)` → синхронизация статуса оборудования
   - `validateApprovalForm(formState)` → валидация формы
   - Рендер-функции для каждого шага визарда (`renderStep1()`, `renderStep2()` и т.д.) вынести в отдельные компоненты в папке [`apps/web/src/components/eps/`](apps/web/src/components/eps/)
3. Создать [`apps/web/src/hooks/useApprovalProcess.ts`](apps/web/src/hooks/useApprovalProcess.ts) с основной бизнес-логикой

**Коммит:** `refactor(eps): decompose handleProcessReview into useApprovalProcess hook and sub-functions`

---

### Задача P1-6: Декомпозиция `jira-service.ts` на модули

**Файл:** [`apps/web/src/lib/jira-service.ts`](apps/web/src/lib/jira-service.ts)  
**Текущее состояние:** 1 060 строк, grade F, функции с complexity 40+  
**Трудозатраты:** 1 день

**Алгоритм разбивки:**

```
apps/web/src/lib/
  jira-service.ts           → оставить только реэкспорты (barrel file)
  jira/
    field-mapping.ts        ← applyJiraFieldMapping(), getJiraFieldMapping(), saveJiraFieldMapping(), extractValueByPath(), transformValue(), testJiraFieldMapping()
    sync.ts                 ← syncJiraIssues()
    metrics.ts              ← calculateSrmMetrics(), calculateAdvancedRamsMetrics()
    notifications.ts        ← notifySrmIncident()
    service-requests.ts     ← createInternalServiceRequest()
    constants.ts            ← все магические числа (HOURS_PER_MS, etc.)
```

**Магические числа для выноса в `constants.ts`:**
```typescript
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;
export const PERCENT_MULTIPLIER = 100;
export const JIRA_SUMMARY_MAX_LENGTH = 104;
export const JIRA_DEFAULT_PAGE_SIZE = 1000;
```

**Коммит:** `refactor(srm): split jira-service.ts into modular files under lib/jira/`

---

## ПРИОРИТЕТ 2 — ВЫСОКИЙ (UI Standards)

### Задача P2-1: Заменить hex-цвета в `Sidebar.tsx` на токены темы

**Файл:** [`apps/web/src/components/layout/Sidebar.tsx`](apps/web/src/components/layout/Sidebar.tsx)  
**Масштаб:** ~60 замен  
**Трудозатраты:** 3–4 часа

**Таблица замен (проверить в теме `apps/web/src/theme/theme.ts`):**

| Текущий hex | Заменить на |
|---|---|
| `#0f172a` | `'grey.900'` или `'text.primary'` |
| `#0b1120` | `'background.paper'` (dark variant) |
| `#1e293b` | `'grey.800'` |
| `#334155` | `'grey.700'` |
| `#475569` | `'grey.600'` |
| `#64748b` | `'text.secondary'` |
| `#94a3b8` | `'grey.400'` |
| `#cbd5e1` | `'grey.300'` |
| `#e2e8f0` | `'divider'` |
| `#f1f5f9` | `'grey.100'` |
| `#f8fafc` | `'grey.50'` |
| `#ffffff` | `'background.paper'` |
| `#38bdf8` | `'primary.light'` |
| `#0284c7` | `'primary.main'` |
| `#0369a1` | `'primary.dark'` |
| `#22c55e` | `'success.main'` |

**Важно:** Для темного сайдбара (`backgroundColor: '#0f172a'`) сначала проверить, задана ли переменная `background.dark` в теме. Если нет — добавить кастомный токен в [`theme.ts`](apps/web/src/theme/theme.ts).

**Коммит:** `refactor(ui): replace hardcoded hex colors with theme tokens in Sidebar.tsx`

---

### Задача P2-2: Заменить hex-цвета в `login/page.tsx`

**Файл:** [`apps/web/src/app/login/page.tsx`](apps/web/src/app/login/page.tsx)  
**Масштаб:** ~30 замен  
**Трудозатраты:** 1–2 часа

Применить те же замены из таблицы выше. Дополнительно:

| Текущий hex | Заменить на |
|---|---|
| `#0284c7` | `'primary.main'` |
| `linear-gradient(135deg, #0284c7 0%, #0369a1 100%)` | `'linear-gradient(135deg, ' + theme.palette.primary.main + ' 0%, ' + theme.palette.primary.dark + ' 100%)'` или вынести в `sx` с `theme` через `(theme) => ({...})` |
| `#bae6fd` | `'primary.100'` (если задано в теме) |
| `#fffbeb` | `'warning.50'` |
| `#fed7aa` | `'warning.200'` |
| `#fde68a` | `'warning.200'` |

**Коммит:** `refactor(ui): replace hardcoded hex colors with theme tokens in login/page.tsx`

---

### Задача P2-3: Заменить hex-цвета в `FeedbackDialog.tsx`

**Файл:** [`apps/web/src/components/feedback/FeedbackDialog.tsx`](apps/web/src/components/feedback/FeedbackDialog.tsx)  
**Масштаб:** ~40 замен  
**Трудозатраты:** 2 часа

Применить стандартную таблицу замен. Специфичные цвета:

| Текущий hex | Заменить на |
|---|---|
| `#ef4444` | `'error.main'` |
| `#8b5cf6` | `'secondary.main'` или `'purple.500'` |
| `#64748b` | `'text.secondary'` |

**Коммит:** `refactor(ui): replace hardcoded hex colors with theme tokens in FeedbackDialog.tsx`

---

### Задача P2-4: Массовая замена hex-цветов в оставшихся файлах

**Файлы (по убыванию числа нарушений):**
1. [`apps/web/src/app/admin/feedback/page.tsx`](apps/web/src/app/admin/feedback/page.tsx) — ~50 замен
2. [`apps/web/src/components/mro/MroExecutionWizardDialog.tsx`](apps/web/src/components/mro/MroExecutionWizardDialog.tsx) — ~20 замен
3. [`apps/web/src/components/wms/WmsOperationWizardDialog.tsx`](apps/web/src/components/wms/WmsOperationWizardDialog.tsx) — ~20 замен
4. [`apps/web/src/components/eps/EquipmentWizardForm.tsx`](apps/web/src/components/eps/EquipmentWizardForm.tsx) — ~15 замен
5. [`apps/web/src/components/wms/CreateNomenclatureDialog.tsx`](apps/web/src/components/wms/CreateNomenclatureDialog.tsx) — ~15 замен
6. [`apps/web/src/components/srm/SrmIssueDetailsDrawer.tsx`](apps/web/src/components/srm/SrmIssueDetailsDrawer.tsx) — ~10 замен
7. [`apps/web/src/app/wms/warehouses/page.tsx`](apps/web/src/app/wms/warehouses/page.tsx) — ~20 замен
8. [`apps/web/src/components/layout/Header.tsx`](apps/web/src/components/layout/Header.tsx) — ~15 замен
9. [`apps/web/src/components/layout/PageHeader.tsx`](apps/web/src/components/layout/PageHeader.tsx) — ~10 замен
10. [`apps/web/src/components/eps/ApprovalWizardDialog.tsx`](apps/web/src/components/eps/ApprovalWizardDialog.tsx) — ~8 замен
11. [`apps/web/src/components/srm/SrmReliabilityAnalytics.tsx`](apps/web/src/components/srm/SrmReliabilityAnalytics.tsx) — палитра `PALETTE` → вынести в `theme.palette.chart.*`
12. [`apps/web/src/app/admin/users/page.tsx`](apps/web/src/app/admin/users/page.tsx) — StatCard iconColor/accentColor пропы
13. [`apps/web/src/app/admin/audit-log/page.tsx`](apps/web/src/app/admin/audit-log/page.tsx) — то же

**Примечание для SrmReliabilityAnalytics:**
```typescript
// ❌ НЕПРАВИЛЬНО
const PALETTE = ['#dc2626', '#d97706', '#0284c7', ...];

// ✅ ПРАВИЛЬНО — использовать из темы
import { useTheme } from '@mui/material';
const theme = useTheme();
const PALETTE = [
  theme.palette.error.main,
  theme.palette.warning.main,
  theme.palette.primary.main,
  theme.palette.success.main,
  // ...
];
```

**Коммит:** `refactor(ui): replace all remaining hardcoded hex colors with theme tokens (batch)`

---

### Задача P2-5: Заменить `<Chip>` на `<StatusBadge>` для статусов сущностей

**Затронутые файлы:**

| Файл | Строка | Текущий код | Замена |
|---|---|---|---|
| [`InfrastructureHealthBanner.tsx`](apps/web/src/components/ui/InfrastructureHealthBanner.tsx:149) | 149 | `<Chip label="Технические работы">` | `<StatusBadge status="MAINTENANCE" />` |
| [`ModuleMaintenanceState.tsx`](apps/web/src/components/ui/ModuleMaintenanceState.tsx:70) | 70 | `<Chip label="Техническое обслуживание">` | `<StatusBadge status="MAINTENANCE" />` |
| [`mro/checklists/page.tsx`](apps/web/src/app/mro/checklists/page.tsx:270) | 270 | `<Chip label="Обязательно" sx={{bgcolor:'#fef2f2', color:'#dc2626'}}>` | `<StatusBadge status="REQUIRED" />` |
| [`srm/page.tsx`](apps/web/src/app/srm/page.tsx:644) | 644 | `<Chip label={issue.source}>` | `<StatusBadge status={issue.source} />` |
| [`FeedbackDialog.tsx`](apps/web/src/components/feedback/FeedbackDialog.tsx:505) | 505 | `<Chip label={v.label} color={v.color}>` | `<StatusBadge status={v.id} />` |
| [`FileUploadDropzone.tsx`](apps/web/src/components/ui/FileUploadDropzone.tsx:273) | 273 | `<Chip label="Готов к отправке">` | `<StatusBadge status="READY" />` |

**Перед заменой:** проверить [`StatusBadge.tsx`](apps/web/src/components/ui/StatusBadge.tsx) на наличие статусов `MAINTENANCE`, `REQUIRED`, `READY`. Если их нет — **добавить** в компонент прежде чем заменять вызовы.

**Допустимые `<Chip>` (НЕ трогать):** артикулы (`label={row.article}`), коды складов (`label={w.code}`), единицы измерения (`label={f.unit}`), счётчики (`label={selectedCount}`), клавиши (`label="ESC"`), теги оборудования.

**Коммит:** `fix(ui): replace Chip with StatusBadge for entity status display (AGENTS.md compliance)`

---

## ПРИОРИТЕТ 3 — СРЕДНИЙ (File Size + Architecture)

### Задача P3-1: Разбить `setup/page.tsx` на шаги-компоненты

**Файл:** [`apps/web/src/app/setup/page.tsx`](apps/web/src/app/setup/page.tsx) — 1 505 строк  
**Трудозатраты:** 0.5 дня

**Структура декомпозиции:**
```
apps/web/src/components/setup/
  SetupStep1Database.tsx      ← шаг настройки БД
  SetupStep2Admin.tsx         ← шаг создания администратора
  SetupStep3Ldap.tsx          ← шаг настройки LDAP
  SetupStep4Storage.tsx       ← шаг настройки хранилища
  SetupStep5Jira.tsx          ← шаг интеграции Jira
  SetupDependencyCheck.tsx    ← проверка зависимостей
  SetupProgressBar.tsx        ← индикатор прогресса
  useSetupWizard.ts           ← хук состояния мастера
```

**Коммит:** `refactor(setup): split setup/page.tsx into step components`

---

### Задача P3-2: Разбить `WmsOperationWizardDialog.tsx` на шаги

**Файл:** [`apps/web/src/components/wms/WmsOperationWizardDialog.tsx`](apps/web/src/components/wms/WmsOperationWizardDialog.tsx) — ~1 400 строк  
**Трудозатраты:** 0.5 дня

**Структура декомпозиции:**
```
apps/web/src/components/wms/
  operation-wizard/
    OperationTypeStep.tsx     ← выбор типа операции
    WarehouseStep.tsx         ← выбор склада
    ItemsSelectionStep.tsx    ← подбор позиций ТМЦ
    SummaryStep.tsx           ← сводка и подтверждение
    useOperationWizard.ts     ← хук состояния
```

**Коммит:** `refactor(wms): split WmsOperationWizardDialog into step components`

---

### Задача P3-3: Разбить `Sidebar.tsx` на подкомпоненты

**Файл:** [`apps/web/src/components/layout/Sidebar.tsx`](apps/web/src/components/layout/Sidebar.tsx) — ~1 300 строк  
**Трудозатраты:** 0.5 дня

**Структура декомпозиции:**
```
apps/web/src/components/layout/
  sidebar/
    SidebarNav.tsx            ← навигационные пункты
    SidebarNavItem.tsx        ← отдельный пункт меню
    SidebarUser.tsx           ← блок пользователя внизу
    SidebarFlyout.tsx         ← выпадающее меню при наведении
    SidebarBadge.tsx          ← бейджи состояний
    useSidebar.ts             ← хук состояния сайдбара
```

**Коммит:** `refactor(layout): decompose Sidebar.tsx into sub-components`

---

### Задача P3-4: Устранить OCP-нарушения в `approvals/page.tsx`

**Файл:** [`apps/web/src/app/eps/approvals/page.tsx`](apps/web/src/app/eps/approvals/page.tsx)  
**Проблема:** 4 type-checks (`if (type === '...')`) вместо полиморфизма  
**Трудозатраты:** 2 часа

```typescript
// ❌ НЕПРАВИЛЬНО — нарушение OCP
if (approvalType === 'PURCHASE') { renderPurchaseForm(); }
if (approvalType === 'WRITEOFF') { renderWriteoffForm(); }

// ✅ ПРАВИЛЬНО — маппинг стратегий
const APPROVAL_FORM_COMPONENTS: Record<ApprovalType, React.ComponentType<ApprovalFormProps>> = {
  PURCHASE: PurchaseApprovalForm,
  WRITEOFF: WriteoffApprovalForm,
  TRANSFER: TransferApprovalForm,
  MAINTENANCE: MaintenanceApprovalForm,
};

const FormComponent = APPROVAL_FORM_COMPONENTS[approvalType];
return <FormComponent {...props} />;
```

**Коммит:** `refactor(eps): replace approval type checks with strategy map (OCP fix)`

---

## Проверочный чеклист после выполнения всех задач

После завершения всех задач агент должен:

- [ ] Запустить `python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --language typescript --json > docs/quality_report_v2.json` и убедиться что средний балл **≥ 80** (grade B)
- [ ] Убедиться что в новом отчёте **нет файлов с grade F**
- [ ] Запустить `grep -r '#[0-9a-fA-F]\{3,6\}' apps/web/src --include="*.tsx" -l | wc -l` и убедиться что результат **< 5** (только разрешённые случаи: print-стили, SVG)
- [ ] Убедиться что `<Chip>` используется **только** в допустимых контекстах (не для статусов сущностей)
- [ ] Проверить что `GET /api/users` возвращает 403 для пользователей без разрешений
- [ ] Проверить что `POST /api/admin/settings/test-ldap` возвращает 429 после 5 быстрых запросов
- [ ] Выполнить финальный коммит: `chore: complete audit remediation P1-P3 all tasks done`
- [ ] Обновить [`docs/CODE_REVIEW_AUDIT.md`](docs/CODE_REVIEW_AUDIT.md) — добавить раздел "Статус устранения" с датой и новым score

---

## Справка: полезные команды

```bash
# Запуск анализатора качества
python .agents/skills/code-reviewer/scripts/code_quality_checker.py apps/web/src --language typescript

# Поиск оставшихся hex-цветов в sx= пропах
grep -rn "sx={{" apps/web/src --include="*.tsx" | grep -oP '#[0-9a-fA-F]{3,8}' | sort | uniq -c | sort -rn

# Поиск использований Chip
grep -rn "<Chip" apps/web/src --include="*.tsx" | wc -l

# Поиск функций без rate limiting (для сравнения)
grep -rn "enforceRateLimit" apps/web/src/app/api --include="*.ts" -l
```
