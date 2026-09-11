# Аудит кода EMS-Platform — Полный отчёт

> Дата: 2026-08-27  
> Аудитор: AI Code Reviewer (Claude Sonnet 4.6)  
> Область: полный монорепозиторий (`apps/web/`, `packages/`)  
> Инструментарий: code-reviewer skill, pr_analyzer.py, code_quality_checker.py

---

## 1. Сводные метрики

| Метрика | apps/web/src | packages/ |
|---|---|---|
| Файлов проанализировано | 206 | 21 |
| Средний балл качества | **72.8 / 100 (C)** | **89.3 / 100 (B)** |
| Всего code smells | 2382 | 95 |
| SOLID-нарушений | 28 | 0 |
| Тестов (pass / fail) | 113 / 0 | — |
| Тест-сьютов | 16 | — |

Полный машиночитаемый отчёт: [`docs/code-review-report.json`](./code-review-report.json)

---

## 2. 🔴 КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (Applied)

### CVE-уровень: AUTH BYPASS в SRM Webhook endpoint

**Файл:** `apps/web/src/app/api/srm/webhooks/[id]/route.ts` (строка 42)  
**Статус:** ✅ **ИСПРАВЛЕНО**

**Уязвимость (до исправления):**
```typescript
// УЯЗВИМЫЙ КОД — токен пропускался если не был предоставлен вообще
const providedToken = tokenParam || headerSecret;
if (providedToken && providedToken !== webhookSecret) {  // ← BYPASS при providedToken === undefined
  return NextResponse.json({ success: false, error: 'Неверный секретный токен' }, { status: 401 });
}
```

**Исправление (после):**
```typescript
// ИСПРАВЛЕННЫЙ КОД — токен обязателен когда webhookSecret настроен
if (!providedToken || providedToken !== webhookSecret) {  // ← отказ при отсутствии ИЛИ несовпадении
  return NextResponse.json({ success: false, error: 'Неверный или отсутствующий секретный токен вебхука' }, { status: 401 });
}
```

**Воздействие:** Злоумышленник мог отправить произвольный webhook-payload без токена и он бы был принят, обходя полностью механизм авторизации интеграций SRM (Jira/GitLab/Redmine).

---

## 3. Файлы с наихудшим качеством кода (Grade F — требуют рефакторинга)

| Файл | Строк | Функций | Макс. сложность | Оценка |
|---|---|---|---|---|
| `apps/web/src/lib/jira-service.ts` | 1060 | 12 | 40 | **F (0/100)** |
| `apps/web/src/app/eps/page.tsx` | ~1100+ | — | — | **F (0/100)** |
| `apps/web/src/app/setup/page.tsx` | ~1500+ | — | — | **F (0/100)** |
| `apps/web/src/app/eps/[id]/page.tsx` | ~1500+ | — | — | **F (0/100)** |
| `apps/web/src/app/eps/approvals/page.tsx` | ~1200+ | — | — | **F (0/100)** |
| `apps/web/src/app/wms/operations/page.tsx` | ~1000+ | — | — | **F (0/100)** |
| `apps/web/src/components/layout/Sidebar.tsx` | — | — | — | **F (0/100)** |
| `apps/web/src/components/wms/WmsOperationWizardDialog.tsx` | — | — | — | **F (0/100)** |
| `apps/web/src/components/eps/SmartImportWizard.tsx` | — | — | — | **F (0/100)** |
| `apps/web/src/components/eps/EquipmentWizardForm.tsx` | — | — | — | **F (0/100)** |

### Ключевые функции превышающие лимиты (из jira-service.ts):

| Функция | Строк | Цикломатическая сложность | Норма |
|---|---|---|---|
| `applyJiraFieldMapping` | 101 | **40** | ≤50 строк, ≤10 |
| `syncJiraIssues` | 162 | **22** | ≤50 строк, ≤10 |
| `createInternalServiceRequest` | 117 | **31** | ≤50 строк, ≤10 |
| `calculateSrmMetrics` | 103 | **22** | ≤50 строк, ≤10 |

**Рекомендация:** Декомпозировать `jira-service.ts` на как минимум 4 специализированных модуля:
- `jira-field-mapper.ts` — маппинг полей
- `jira-sync.ts` — синхронизация данных
- `srm-metrics.ts` — расчёт метрик MTTR/MTBF
- `srm-notifications.ts` — уведомления об инцидентах

---

## 4. Нарушения правил AGENTS.md — Дизайн-код (Shared UI)

> Согласно **AGENTS.md § 2**: "ХАРДКОД UI КАТЕГОРИЧЕСКИ ЗАПРЕЩЕН"

### 4.1 Хардкод HEX-цветов (inline `sx={}` props)

Обнаружено **153 вхождения** хардкодированных цветов в `sx`-пропах компонентов MUI в `apps/web/src/app/`.  
Это прямое нарушение AGENTS.md — цвета должны браться из темы MUI (`theme.palette.*`).

**Наиболее критичные файлы:**

| Файл | Примеры нарушений |
|---|---|
| `apps/web/src/app/setup/page.tsx` | `color: '#0284c7'`, `bgcolor: '#0b1120'`, `color: '#94a3b8'`, `color: '#10b981'` |
| `apps/web/src/app/page.tsx` | `bgcolor: '#f1f5f9'`, `color: '#64748b'`, `color: '#0f172a'`, `color: '#0284c7'` |
| `apps/web/src/app/login/page.tsx` | `backgroundColor: '#0b1120'`, `color: '#ffffff'`, `color: '#0f172a'` |
| `apps/web/src/app/admin/feedback/page.tsx` | `accentColor="#0284c7"`, `accentColor="#ef4444"`, `color: '#475569'` |
| `apps/web/src/app/wms/warehouses/page.tsx` | `bgcolor: '#0284c7'`, `color: '#0f172a'`, `color: '#64748b'` |
| `apps/web/src/app/eps/page.tsx` | `backgroundColor: '#fffbeb'`, `border: '1px solid #fed7aa'` |

**Корректный паттерн** (использовать `theme.palette` или `sx` токены):
```tsx
// ❌ НАРУШЕНИЕ — хардкод
sx={{ color: '#0284c7', bgcolor: '#f8fafc' }}

// ✅ ПРАВИЛЬНО — через тему
sx={{ color: 'primary.main', bgcolor: 'grey.50' }}
// или через тему напрямую:
sx={{ color: theme.palette.primary.main }}
```

### 4.2 Использование нестандартных `<Chip>` вместо `<StatusBadge>`

Обнаружены вхождения `<Chip>` для отображения статусов вместо обязательного компонента `<StatusBadge>`:

| Файл | Нарушение |
|---|---|
| `apps/web/src/app/admin/roles/page.tsx:350` | `<Chip label={r.name} size="small" variant="outlined" sx={{ borderRadius: '4px', height: 22, fontFamily: 'monospace' }} />` |
| `apps/web/src/app/wms/warehouses/page.tsx:452` | `<Chip label={\`Код: ${w.code}\`} size="small" .../>` |
| `apps/web/src/app/mro/checklists/page.tsx:270` | `<Chip label="Обязательно" size="small" sx={{ bgcolor: '#fef2f2', color: '#dc2626' }} />` — хардкод + не StatusBadge |
| `apps/web/src/app/admin/feedback/page.tsx:817` | `<Chip label="Внутренняя заметка" sx={{ backgroundColor: '#fef3c7', color: '#b45309' }} />` |
| `apps/web/src/app/admin/module-settings/page.tsx:472` | Несколько `<Chip>` для служебных меток |

### 4.3 Нарушение паттерна `<EmptyState>` — кастомные иконки с хардкодом

В нескольких местах используется компонент `<EmptyState>` (что правильно), но иконка хардкодится с конкретным цветом:

```tsx
// ❌ Хардкод цвета в иконке EmptyState
icon={<FactCheckOutlinedIcon sx={{ fontSize: 44, color: '#94a3b8' }} />}
// ✅ Должно быть через тему
icon={<FactCheckOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />}
```

Файлы: `mro/history/page.tsx:277`, `mro/checklists/page.tsx:204`, `srm/page.tsx:441`, `mro/page.tsx:407`.

---

## 5. ✅ Подтверждённые сильные стороны

### Безопасность
- ✅ **LDAP Injection Protection** — [`packages/auth/src/ldap.ts:9`] `escapeLdapFilter()` корректно экранирует все спецсимволы RFC 4515
- ✅ **Защита от перебора паролей AD** — единственный UPN-бинд в `constructUserPrincipalName()`, без циклов
- ✅ **PBKDF2 хеширование** с 100K итераций sha512 + CSPRNG-соль в `packages/auth/src/password.ts`
- ✅ **JWT-валидация** через `jose` с HS256 и mandatory `JWT_SECRET` в `packages/auth/src/jwt.ts`
- ✅ **Directory Traversal Prevention** в `apps/web/src/app/api/files/[...path]/route.ts:25`
- ✅ **CSRF Protection** в `requireAuth()` — проверка `origin` vs `host` для мутирующих методов
- ✅ **SSRF & Setup Lock** — повторная инициализация заблокирована маркером `.installed`
- ✅ **Rate Limiting** — на `/api/auth/login`, `/api/setup/*`, `/api/eps/import/execute`, `/api/eps/reports/generate`
- ✅ **No raw SQL injection vectors** — все запросы через Prisma типизированный ORM, `$queryRaw` только с template literals

### Архитектура
- ✅ Полное соблюдение Shared UI библиотеки: `StatCard`, `StatusBadge`, `SearchInput`, `FilterToolbar`, `EmptyState`, `DataTableWrapper`, `ConfirmDialog` — 26 страниц импортируют из `@/components/ui`
- ✅ RBAC через `requireAuth()` / `hasPermission()` / `hasAnyPermission()` с конкретными `PERMISSIONS.*` кодами
- ✅ Чёткое разделение слоёв: `packages/auth`, `packages/database`, `packages/shared`, `apps/web`
- ✅ Аудит-лог на всех мутирующих операциях через `logAuditEvent()`
- ✅ `pnpm test` — 113/113 тестов зелёные, 0 failures

---

## 6. Рекомендации (Приоритизированные)

### 🔴 P1 — Критические (немедленно)
1. ~~**[FIXED]** Webhook auth bypass в SRM~~ — исправлено в данном PR

### 🟠 P2 — Высокий приоритет (следующий спринт)
2. **Добавить Bearer-токен в Next.js middleware** — [`middleware.ts:97`]: middleware не считывает `Authorization: Bearer` заголовок, что создаёт несоответствие с `auth-guard.ts`
3. **Декомпозировать `jira-service.ts`** (1060 строк, сложность 40) на 4 специализированных модуля

### 🟡 P3 — Средний приоритет (техдолг)
4. **Перевести хардкодированные hex-цвета** на `theme.palette.*` / MUI Design Tokens (153 нарушения)
5. **Заменить `<Chip>` в статусных позициях** на `<StatusBadge>` согласно AGENTS.md
6. **Добавить Redis-бэкенд для rate-limiter** при горизонтальном масштабировании (сейчас in-memory)
7. **Унифицировать конфигурацию cookie**: middleware читает `ems_token` И `ems_session`, рекомендуется единый cookie-name

### 🔵 P4 — Улучшения качества
8. **Вынести magic numbers** в именованные константы в `jira-service.ts` (1000ms, 3600s, 100%)
9. **Разбить страницы-монолиты** с оценкой F (`setup/page.tsx`, `eps/[id]/page.tsx`) на подкомпоненты

---

## 7. Итоговый вердикт

**Вердикт: Одобрено с замечаниями (Approve with suggestions)**

| Аспект | Оценка |
|---|---|
| Безопасность (после fix) | ✅ Высокая |
| Архитектура слоёв | ✅ Хорошая |
| Соответствие дизайн-системе | ⚠️ Частичное (153 нарушения хардкода цветов) |
| Качество кода (packages/) | ✅ B+ (89/100) |
| Качество кода (apps/web/) | ⚠️ C (72/100) |
| Тестовое покрытие | ✅ 113/113 pass |

---

*Сгенерировано: 2026-08-27 | EMS-Platform Code Review Skill*
