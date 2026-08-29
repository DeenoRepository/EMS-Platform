# Инспекция проекта EMS-Platform

**Дата актуализации:** 2026-08-29  
**Инструменты:** `code_quality_checker.py`, `route_audit.py`, `inspect_summary.py`, `fgrade_detail.py`, `tsc`, Jest test runner  
**Охват:** `apps/web/src` (272 файла), `apps/web/src/app/api` (85 роутов), `packages/` (22 файла)  
**Правила:** AGENTS.md v2.0, `universal.md`, `languages/typescript.md`

---

## 1. Сводка результатов

| Метрика | Значение | Статус |
|---|---|---|
| Файлов проанализировано (web) | **272** | Вся кодовая база Next.js |
| Файлов проанализировано (packages) | **22** | Базовые пакеты auth, database, shared |
| Средний балл качества (web) | **77.8 / 100** | Grade C (улучшен с 73.7) |
| Средний балл качества (packages) | **91.2 / 100** | Grade A |
| API-роутов проверено на безопасность | **85 / 85** | ✅ 100% покрыты auth & rate-limit |
| Hex-цветов в `sx={}` | **0** | ✅ 100% theme tokens |
| Статусы сущностей через `<Chip>` | **0** | ✅ 100% `<StatusBadge>` |
| Тесты (Unit & Integration) | **146 / 146 passed** | ✅ 100% pass |
| TypeScript проверка (`tsc --noEmit`) | **0 ошибок** | ✅ Pass |

---

## 2. Безопасность (Security)

### 2.1 RBAC и авторизация — ✅ СОБЛЮДАЕТСЯ
Все 85 API-роутов проверяют авторизацию и права доступа (через `requireAuth()` или связку `getCurrentUser()` + `hasPermission()`).
Роуты без RBAC (например, `/api/auth/me`, `/api/auth/logout`, `/api/notifications`) обоснованы семантически как персональные эндпоинты текущего пользователя.

### 2.2 Rate Limiting — ✅ СОБЛЮДАЕТСЯ
Все чувствительные маршруты (авторизация, setup wizard, дампы БД, тесты подключений LDAP/Jira, синхронизация интеграций) защищены префиксным `enforceRateLimit()`.

### 2.3 Webhook-аутентификация — ✅ ВЕРИФИЦИРОВАНО
В `apps/web/src/app/api/srm/webhooks/[id]/route.ts` реализована строгая проверка токена: запросы без секрета или с неверным секретом отклоняются со статусом 401. Также типизированы конфигурации и тела запросов (`Prisma.InputJsonValue`).

### 2.4 SQL и ORM безопасность — ✅ СОБЛЮДАЕТСЯ
Все запросы к БД выполняются через типизированный Prisma Client. `$queryRaw` применяется исключительно с template literals в health-check маршрутах.

---

## 3. Архитектура и декомпозиция (Выполненные работы)

1. **Декомпозиция паспорта оборудования (`apps/web/src/app/eps/[id]/page.tsx`)**:
   - Монолитный файл декомпозирован на независимые модули:
     - `EquipmentPassportOverview.tsx` — карточки KPI, технические характеристики, индекс здоровья;
     - `EquipmentDocumentsTab.tsx` — документация и чертежи;
     - `EquipmentApprovalsTab.tsx` — согласования и заявки;
     - `EquipmentOperationalTabs.tsx` — ЗИП, ТОиР, SRM, история и аудит;
     - `EquipmentEditDialog.tsx` — форма редактирования параметров;
     - `EquipmentPassportAuxiliaryDialogs.tsx` — вспомогательные диалоги загрузки и согласования.
   - God-функции устранены, размер страницы сокращен с 2024 до 440 строк.

2. **Декомпозиция архива технической документации (`apps/web/src/app/eps/documents/page.tsx`)**:
   - Вынесен диалог `DocumentUploadDialog.tsx` с валидацией файлов.
   - Вынесена таблица реестра `DocumentArchiveTableView.tsx`.
   - Размер файла сокращен с 922 до 486 строк.

3. **Декомпозиция панели настроек модулей (`apps/web/src/app/admin/module-settings/page.tsx`)**:
   - Вынесены диалоги создания разделов, параметров и тегов в `ModuleSettingsDialogs.tsx`.
   - Вынесена вкладка структуры EPS в `ModuleSettingsEpsTab.tsx`.
   - Размер файла сокращен с 1239 до 442 строк.

4. **Рефакторинг сервисов SRM / Jira (`apps/web/src/lib/jira/service-requests.ts`)**:
   - Функция `createInternalServiceRequest` декомпозирована на отдельные изолированные шаги (генерация ключа, расчет SLA, обновление статуса оборудования, рассылка уведомлений).
   - Заменены прямые `console.warn` на структурированный `logger.warn`.

5. **Очистка от мусора и устаревших файлов**:
   - Удалены временные JSON-дампы проверок качества.
   - Утилиты проверки (`inspect_summary.py`, `fgrade_detail.py`) переведены на динамическое выполнение без создания мусорных файлов.

---

## 4. Верификационные команды

```bash
# Проверка типов TypeScript
pnpm --filter @ems/web exec tsc --noEmit

# Запуск полного набора тестов
pnpm test

# Сводка качества кода
python scripts/inspect_summary.py

# Аудит безопасности API-роутов
python scripts/route_audit.py
```
