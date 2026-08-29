# EMS-Platform — Отчёт о инспекции кода

> **Дата аудита:** 2026-08-27 (baseline remediation)
> **Повторная инспекция:** 2026-08-29 — см. [`PROJECT_INSPECTION.md`](PROJECT_INSPECTION.md)
> **Инструмент:** `code_quality_checker.py` (TypeScript/TSX) + ручной анализ
> **Покрытие (2026-08-29):** `apps/web/src` — 279 файлов; `packages` — 30 файлов
> **Итоговая оценка web:** **C (78.3 / 100)**; packages **A (94.1 / 100)**
> **Вердикт:** ✅ **Quality baseline PASS** (`pnpm check:quality`). Критические security findings из исходного аудита устранены. Остаточный UI-долг: Chip вместо `StatusBadge` в паспорте оборудования. Автоматический checker фиксирует low-priority smells и ограничения парсера TSX.

---

## Сводка результатов

| Метрика | 2026-08-27 | 2026-08-29 |
|---|---|---|
| Проанализировано файлов (web) | 219 | **279** |
| Средний балл web | 73.7 / 100 | **78.3 / 100** |
| Общая оценка web | C | **C** |
| Code smells (web) | 2 325 | **2 353** |
| SOLID (web) | 28 | **25** |
| F-grade (web / packages) | — | **38 / 0** |
| Packages score | — | **94.1 / 100 (A)** |
| Quality baseline | — | **PASS** |
| Theme hex | — | **0** |
| Rate-limit gaps | — | **0 / 85 routes** |

### Ограничения автоматического отчёта

`code_quality_checker.py` используется как индикатор тренда, но не как единственный источник истины: он некорректно определяет границы некоторых функций в TSX. Поэтому ложные claims о функциях размером сотни строк были закрыты ручной проверкой исходного кода, а не механическим рефакторингом.

---

## Выполненные remediation-истории

### Security

- [`apps/web/src/app/api/users/route.ts`](../apps/web/src/app/api/users/route.ts) получил RBAC-проверку после аутентификации: неавторизованные пользователи получают `403`.
- [`apps/web/src/app/api/admin/settings/test-ldap/route.ts`](../apps/web/src/app/api/admin/settings/test-ldap/route.ts) и [`apps/web/src/app/api/admin/settings/test-srm/route.ts`](../apps/web/src/app/api/admin/settings/test-srm/route.ts) используют rate limiting `5/min`.
- Jira connectivity proxy не получил второй limiter, поскольку делегирует запрос SRM handler и двойное ограничение ухудшило бы quota semantics.
- Webhook secret validation, LDAP escaping, RBAC на ключевых API и Prisma ORM сохранены и проверены.

### UI consistency

- Theme token migration выполнена в Sidebar, login и FeedbackDialog; прямые hex-значения в этих затронутых областях заменены на semantic tokens либо `alpha(theme.palette.*)`.
- Entity statuses мигрированы с [`Chip`](../apps/web/src/components/ui/StatusBadge.tsx) на [`StatusBadge`](../apps/web/src/components/ui/StatusBadge.tsx). Chips для идентификаторов, количества, единиц измерения, вложений и прочих metadata сохранены намеренно.
- Исправлено предупреждение `DataTableWrapper`: effect восстановления настроек учитывает `columns`.

### Modularization

- EPS custom-field renderer вынесен в [`CustomFieldValueRenderer`](../apps/web/src/components/eps/CustomFieldValueRenderer.tsx).
- Jira/SRM service разделён на focused modules с compatibility barrel в [`jira-service.ts`](../apps/web/src/lib/jira-service.ts).
- Setup wizard разделён на три presentation steps с сохранением state и handlers в route owner.
- WMS operation wizard разделён на [`WmsOperationSetupStep`](../apps/web/src/components/wms/WmsOperationSetupStep.tsx), [`WmsOperationItemsStep`](../apps/web/src/components/wms/WmsOperationItemsStep.tsx) и [`WmsOperationReviewStep`](../apps/web/src/components/wms/WmsOperationReviewStep.tsx); state, fetching, validation и submit logic остались в родителе.
- Sidebar decomposition исследована, но небезопасная extraction была отменена после проверки зависимости и поведения; исходный файл восстановлен без незакоммиченных изменений.
- Approval type branching заменён на явные strategy maps в [`approvals/page.tsx`](../apps/web/src/app/eps/approvals/page.tsx).

---

## Отдельно проверенные решения

- `handleBulkPrint` в EPS фактически является коротким вызовом native `window.print()` и не требует искусственного hook extraction.
- `handleProcessReview` в approvals фактически является компактным API workflow; повторяющийся decision mapping вынесен в map без изменения поведения.
- Неподтверждённые function boundaries quality checker не трактуются как реальные нарушения.

---

## Итоговая проверка

Команды, выполненные для текущего baseline:

```text
pnpm --filter @ems/web lint
pnpm --filter @ems/web exec tsc --noEmit
pnpm test
pnpm --filter @ems/web build
python .agents\\skills\\code-reviewer\\scripts\\code_quality_checker.py apps\\web\\src --language typescript --json
```

Результаты 2026-08-27:

- lint: pass, без warnings/errors;
- TypeScript: pass;
- tests: 113 passed, 0 failed;
- production build: pass, 33 static pages generated;
- quality scan: 219 files, 73.7/100, grade C, 2 325 smells, 28 SOLID findings.

Повтор 2026-08-29 @ `0f57ab3` (`pnpm check:quality`, route audit, theme check): web 78.3/100, 2 353 smells, 25 SOLID, 38 F-grade; packages 94.1/100, 0 F-grade; baseline PASS. Актуальный план — [`PROJECT_INSPECTION.md`](PROJECT_INSPECTION.md), [`REMEDIATION_PLAN.md`](REMEDIATION_PLAN.md).

Оставшиеся quality-scan findings относятся преимущественно к широкому legacy smell inventory, остаточной типизации/размеру отдельных presentation files и policy cleanup вне подтверждённых critical paths. Их следует устранять отдельными bounded stories с ручной проверкой, а не массовыми автоматическими заменами.

---

*Аудит обновлён после инспекции 2026-08-29. Версия правил: 2.0 (AGENTS.md).*
