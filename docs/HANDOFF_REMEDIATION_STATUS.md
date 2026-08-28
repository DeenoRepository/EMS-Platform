# EMS-Platform — Handoff Document & Remediation State

**Дата фиксации:** 2026-08-28  
**Текущая ветка:** `main`  
**Базовые документы:** [`docs/REMEDIATION_EXECUTION_PLAN.md`](REMEDIATION_EXECUTION_PLAN.md), [`docs/PROJECT_INSPECTION_2026-08-28.md`](PROJECT_INSPECTION_2026-08-28.md), [`AGENTS.md`](../AGENTS.md)

---

## 1. Сводка выполненных этапов

### ✅ Фаза 0: Baseline & Scope Lock
- Все метрики зафиксированы: `pnpm lint` (0 errors), `pnpm test` (все тесты проходят), `tsc --noEmit` (0 errors).
- Отчёты code quality: `apps/web/src` (74.4 / C, 0 F-files), `packages` (89.3 / B, 0 F-files).

### ✅ Фаза 1: P0 Dependency & Supply-Chain Unblock
- **Next.js & ESLint**: обновлены до `14.2.35` (закрыта критическая уязвимость Authorization Bypass).
- **XLSX / SheetJS**: обновлен до официального патченного релиза `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (устранены Prototype Pollution и ReDoS).
- **PostCSS & Deepmerge-TS**: добавлены `overrides` в `pnpm-workspace.yaml` (`postcss: ^8.5.3`, `deepmerge-ts: ^8.0.0`, `glob: ^10.5.0`), устранены path traversal и stack exhaustion advisories.
- **Lockfile & Build**: `pnpm-lock.yaml` регенерирован, `pnpm build` собирает все 33 страницы без ошибок.
- **Commit:** `c094a90 chore(deps): remediate nextjs xlsx postcss and prisma supply chain advisories`

### ✅ Фаза 2: P1 API Security Hardening & Safe Errors
- **Rate Limiting Matrix**:
  - `apps/web/src/app/api/eps/import/analyze/route.ts` (10/min, лимиты на 15 МБ, 5000 строк, 150 колонок).
  - `apps/web/src/app/api/eps/import/template/route.ts` (30/min).
  - `apps/web/src/app/api/eps/reports/templates/route.ts` (GET 60/min, POST 20/min).
  - `apps/web/src/app/api/eps/reports/templates/[id]/route.ts` (30/min).
  - `apps/web/src/app/api/setup/status/route.ts` (30/min, санитизация `systemInfo` для не-админов).
  - `apps/web/src/app/api/auth/logout/route.ts` (60/min).
  - `apps/web/src/app/api/auth/me/route.ts` (120/min).
  - `apps/web/src/app/api/system/health/route.ts` (60/min).
- **Health Policy (`/api/system/health`)**:
  - Публичный вызов возвращает минимальный ответ `{ success: true, status: 'ok'|'degraded', isReady, timestamp }` с `Cache-Control: no-store`.
  - Диагностика (`?diagnostics=true`) требует аутентификации администратора (`PERMISSIONS.ADMIN_SETTINGS_MANAGE` или `admin`).
  - Очистка сокетов и таймаутов (`clearTimeout`) при сетевых пробах.
- **Safe Error Response**:
  - Расширен [`apps/web/src/lib/safe-error.ts`](../apps/web/src/lib/safe-error.ts) функцией `safeErrorResponse(error, publicMessage, status)`.
  - Убрана утечка `error.message` / `details` в 5xx ответах во всех API-маршрутах: `admin/database/dump`, `admin/roles`, `admin/users`, `auth/login`, `auth/me`, `eps/approvals`, `eps/custom-sections`, `eps/documents`, `eps/equipment`, `feedback`, `mro/schedules`, `setup/status`, `setup/test-ldap`, `srm/integrations`, `srm/issues`, `srm/mapping`.
- **Bounded Webhooks & SSRF**:
  - `apps/web/src/app/api/srm/webhooks/[id]/route.ts`: ограничение тела до 5 МБ, `take: 1000` при поиске оборудования.

### ✅ Фаза 3: Test & CI Foundation
- Добавлен тестовый регрессионный сьют [`apps/web/src/lib/__tests__/api-security.test.ts`](../apps/web/src/lib/__tests__/api-security.test.ts):
  - Проверка блокировки 429 при превышении квоты rate limit.
  - Проверка независимости префиксов и пользовательских идентификаторов.
  - Проверка скрытия внутренних деталей БД/паролей/путей в ответах 5xx.
- Изолирована переменная окружения `DATABASE_URL` в скрипте `test`.
- Обновлен [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) со стадиями: lint, typecheck, unit tests, theme check, production build.
- **Commit:** `2141809 fix(security): complete rate limit matrix, safe error handling and health policy with regressions`

### 🔄 Фаза 4: UI Design-System Remediation (В процессе)
- Начата миграция hardcoded цветов в общих компонентах:
  - [`StatCard.tsx`](../apps/web/src/components/ui/StatCard.tsx): очищен от прямых hex-пропов.
  - [`ErrorState.tsx`](../apps/web/src/components/ui/ErrorState.tsx): переведен на `error.light`, `error.main`, `divider`, `background.paper`, `text.primary`.
- **Commit:** `498f470 refactor(ui): migrate StatCard and ErrorState to semantic theme tokens`

---

## 2. Лог выполненных коммитов в этой сессии

```text
498f470 refactor(ui): migrate StatCard and ErrorState to semantic theme tokens
2141809 fix(security): complete rate limit matrix, safe error handling and health policy with regressions
c094a90 chore(deps): remediate nextjs xlsx postcss and prisma supply chain advisories
c1dfb2a docs: add phased remediation execution plan
```

---

## 3. Инструкция для следующего агента / рабочего места

### Шаг 1: Проверка готовности после `git pull`
```bash
pnpm install
pnpm db:generate
pnpm lint
pnpm --filter @ems/web exec tsc --noEmit
pnpm test
```
*Ожидаемый результат:* 131 test passing, 0 failing, 0 type errors, 0 lint errors.

### Шаг 2: Продолжение Фазы 4 (UI Tokens & Shared Controls)
Оставшиеся файлы с hardcoded цветами для миграции на `theme.palette.*`:
1. `apps/web/src/components/ui/` (остаток: `DataTableWrapper.tsx`, `ActivityFeed.tsx`, `ApprovalStepper.tsx`, `CommandPalette.tsx`, `DocumentPreviewDialog.tsx`, `FileUploadDropzone.tsx`, `LifecycleTimeline.tsx`).
2. `apps/web/src/app/admin/feedback/page.tsx`, `apps/web/src/app/admin/audit-log/page.tsx`, `apps/web/src/app/admin/roles/page.tsx`.
3. `apps/web/src/components/wms/` (`WarehouseTopologyModal.tsx`, `InventoryCompleteModal.tsx`, `TransferRequestDialog.tsx`).
4. Обновить [`scripts/check-theme-tokens.mjs`](../scripts/check-theme-tokens.mjs) для блокирующего exit code 1 при нахождении нарушений.

### Шаг 3: Переход к Фазе 5 (Quality & Modularization)
1. [`packages/auth/src/ldap.ts`](../packages/auth/src/ldap.ts) — декомпозиция на config parsing, connection/transport, filter escaping, user mapping (сохранить все regression tests).
2. EPS страницы: декомпозиция крупных функций на подкомпоненты/хуки в `apps/web/src/app/eps/[id]/page.tsx`, `apps/web/src/app/eps/page.tsx`, `apps/web/src/app/eps/approvals/page.tsx`.
3. WMS страницы: декомпозиция `apps/web/src/app/wms/operations/page.tsx` и `apps/web/src/app/wms/warehouses/page.tsx`.

### Шаг 4: Финальная приемка (Фаза 6)
Запустить полный цикл валидации (§1.3 из [`REMEDIATION_EXECUTION_PLAN.md`](REMEDIATION_EXECUTION_PLAN.md)):
```bash
pnpm db:generate && pnpm lint && pnpm --filter @ems/web exec tsc --noEmit && pnpm test && pnpm check:theme && pnpm build
```
