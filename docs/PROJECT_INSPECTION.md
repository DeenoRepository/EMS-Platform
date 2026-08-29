# EMS-Platform — актуальная инспекция и план устранения замечаний

**Дата инспекции:** 2026-08-29  
**Назначение:** зафиксировать проверяемое состояние проекта, удалить подтверждённый мусор и передать следующим агентам Gemini 3.7 Flash детальный, ограниченный по объёму план ремедиации.  
**Правила:** [`AGENTS.md`](../AGENTS.md), `.agents/skills/code-reviewer/rules/universal.md`, `.agents/skills/code-reviewer/languages/typescript.md`.

> **Статус документа:** baseline-план. В рамках этой инспекции исправлялись только безопасные артефакты отчётности; функциональная ремедиация исходного кода не выполнялась.

---

## 1. Executive summary

Репозиторий находится в чистом Git-состоянии после удаления локально сгенерированных JSON-отчётов качества. Основной объём технического долга сосредоточен в web-слое, а не в пакетах:

| Область | Результат | Оценка |
|---|---:|---|
| `apps/web/src` | 272 файла, средний балл 77.8/100, 2 348 smell-записей, 25 SOLID | Grade C |
| `packages` | 22 файла, средний балл 91.2/100, 87 smell-записей, 0 SOLID | Grade A |
| F-grade web-файлы | 39 | превышение порога не обнаружено, но все требуют bounded remediation |
| F-grade package-файлы | 2: `seed.ts`, `eps.test.ts` | обязательная декомпозиция/очистка |
| API route audit | 85 маршрутов | rate-limit gap: 0; heuristic auth gaps: 2 public + 10 personal/admin-only candidates |
| Theme token check | hex-нарушений вне разрешённых theme-файлов: 0 | pass |
| Git artifacts | tracked-мусор не найден; generated `quality-*.json` удалён | clean |

### Ключевой вывод

Автоматический quality checker сейчас **не проходит baseline** только по web smell count: `2348 > 2226`. Средний балл, количество F-файлов и SOLID-показатель проходят установленный baseline. Это не основание для массового переписывания: checker имеет ограничения на разбор TSX, поэтому исправления должны идти небольшими story с ручной проверкой и тестами.

---

## 2. Что было очищено

Удалены только файлы, которые были сгенерированы локальной командой `pnpm check:quality` и не являются исходными артефактами проекта:

- `quality-web.json`
- `quality-packages.json`

Они исключены из Git и не должны коммититься. Команда `pnpm check:quality` в текущем виде пишет эти временные отчёты в корень репозитория; это отмечено как отдельный backlog item по улучшению tooling.

### Что намеренно не удалялось

- `temp/`, `.env`, `.next/`, `node_modules/`, `dist/` — локальные ignored-артефакты; их наличие ожидаемо, автоматическое удаление могло уничтожить входные данные или рабочее окружение.
- `docker/jira/server.js` — production runtime artifact, явно копируемый Dockerfile в образ.
- `docker/jira/server.ts` — исходник dev/build-сценария, используемый `pnpm jira:start` и Docker build.
- `scripts/update_feedback_schema.sql` — legacy/manual migration; функционально дублирует часть Prisma schema, но удаление без проверки production history небезопасно.
- `docs/database_topology.html` и Mermaid-файлы — документационные представления, требующие проверки владельцем, а не безусловного удаления.
- seed/import/reset-скрипты — операционные инструменты, несмотря на demo/default values.

---

## 3. Воспроизводимые проверки

Запускать из корня репозитория [`d:/Projects/EMS-Platform`](../):

```bash
pnpm --filter @ems/web lint
pnpm --filter @ems/web exec tsc --noEmit
pnpm test
pnpm --filter @ems/web build
pnpm check:theme
python scripts/inspect_summary.py
python scripts/fgrade_detail.py
python scripts/route_audit.py
```

Для проверки baseline без сохранения JSON-отчётов в корень используйте временную директорию ОС либо отдельный ignored-каталог. Текущий `pnpm check:quality` создаёт `quality-web.json` и `quality-packages.json`; после проверки их нужно удалить.

---

## 4. Подтверждённые замечания и план для следующих агентов

### P0 — безопасность и секреты

#### P0.1 Удалить реальные/default secrets из runtime-конфигураций
**Доказательства:** [`docker-compose.yml`](../docker-compose.yml:9), [`apps/web/src/app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx:148), [`docs/JIRA_SRM_SETUP.md`](JIRA_SRM_SETUP.md:68), [`packages/database/src/reset-admin.ts`](../packages/database/src/reset-admin.ts:12).

Проблемы:
- compose содержит небезопасные fallback passwords и JWT secret;
- setup UI предзаполняет `postgrespassword`, `admin123`, `adminpassword`;
- документация показывает `JIRA_API_TOKEN=adminpassword`;
- reset-admin принудительно выставляет известный пароль.

План:
1. Перенести demo credentials только в явно маркированные local-dev fixtures.
2. Для production требовать значения через environment/secrets manager и завершать запуск при дефолтных секретах.
3. Setup UI сделать пустым для секретных полей; оставить только non-secret defaults.
4. `reset-admin` принимать пароль через безопасный интерактивный/ENV-механизм, не логировать его.
5. Обновить compose examples и security tests; проверить отсутствие секретов regex-сканом.

Критерий готовности: ни один production/default path не содержит известный пароль или статический JWT secret; `pnpm test`, lint, tsc и compose config проходят.

#### P0.2 Провести ручную проверку heuristic auth findings
Маршруты без явного auth по аудиту: login и SRM webhook — ожидаемые публичные boundary, но должны иметь отдельные контрактные тесты. Маршруты с `getCurrentUser()` без явного `PERMISSIONS.*` включают персональные уведомления, auth endpoints, setup и file serving. Проверить ownership/object-level access для каждого, особенно [`apps/web/src/app/api/files/[...path]/route.ts`](../apps/web/src/app/api/files/[...path]/route.ts:18) и setup routes.

---

### P1 — quality baseline и большие файлы

Установленный порог: функция >50 строк, файл >500 строк, complexity >10. Приоритет не по имени файла, а по комбинации размера, complexity и чувствительности.

#### P1.1 Setup и admin
- [`apps/web/src/app/setup/page.tsx`](../apps/web/src/app/setup/page.tsx:132) — 855 строк; `handleExecuteSetup`, `handleTestLdapAuth`.
- [`apps/web/src/app/admin/settings/page.tsx`](../apps/web/src/app/admin/settings/page.tsx:1) — 1096 строк.
- [`apps/web/src/app/admin/feedback/page.tsx`](../apps/web/src/app/admin/feedback/page.tsx:1) — 894 строки.
- [`apps/web/src/app/admin/audit-log/page.tsx`](../apps/web/src/app/admin/audit-log/page.tsx:1) — high complexity sorting handler.
- [`apps/web/src/app/admin/roles/page.tsx`](../apps/web/src/app/admin/roles/page.tsx:1) — 568 строк.

Декомпозировать по data hooks, query/filter model, dialog/presentation components и pure utility functions. Не менять API contract без тестов.

#### P1.2 EPS
- [`apps/web/src/components/eps/EquipmentWizardForm.tsx`](../apps/web/src/components/eps/EquipmentWizardForm.tsx:1) — 842 строки.
- [`apps/web/src/components/eps/SmartImportWizard.tsx`](../apps/web/src/components/eps/SmartImportWizard.tsx:1) — 819 строк.
- [`apps/web/src/components/eps/EquipmentTableView.tsx`](../apps/web/src/components/eps/EquipmentTableView.tsx:1) — 597 строк.
- [`apps/web/src/app/eps/[id]/page.tsx`](../apps/web/src/app/eps/[id]/page.tsx:1) — 754 строки.
- [`apps/web/src/app/eps/reports/page.tsx`](../apps/web/src/app/eps/reports/page.tsx:1) — 841 строк.

Сначала извлечь pure mapping/validation, затем field groups/dialogs, затем data fetching. Для import/report отдельно добавить fixture tests и проверки больших payloads.

#### P1.3 WMS
- [`apps/web/src/app/wms/page.tsx`](../apps/web/src/app/wms/page.tsx:1)
- [`apps/web/src/app/wms/stock/page.tsx`](../apps/web/src/app/wms/stock/page.tsx:1)
- [`apps/web/src/app/wms/operations/page.tsx`](../apps/web/src/app/wms/operations/page.tsx:1)
- [`apps/web/src/app/wms/inventory/page.tsx`](../apps/web/src/app/wms/inventory/page.tsx:1)
- [`apps/web/src/app/wms/warehouses/page.tsx`](../apps/web/src/app/wms/warehouses/page.tsx:1)
- [`apps/web/src/components/wms/WarehouseTopologyModal.tsx`](../apps/web/src/components/wms/WarehouseTopologyModal.tsx:1)
- [`apps/web/src/components/wms/WmsOperationWizardDialog.tsx`](../apps/web/src/components/wms/WmsOperationWizardDialog.tsx:1)
- [`apps/web/src/components/wms/WmsOperationItemsStep.tsx`](../apps/web/src/components/wms/WmsOperationItemsStep.tsx:1)
- [`apps/web/src/components/wms/StockDetailDrawer.tsx`](../apps/web/src/components/wms/StockDetailDrawer.tsx:1)
- [`apps/web/src/components/wms/TransferRequestDialog.tsx`](../apps/web/src/components/wms/TransferRequestDialog.tsx:1)

Проверить особенно stock/transfer invariants, async loops, floating promises и rollback/error paths.

#### P1.4 Shared UI
- [`apps/web/src/components/ui/DataTableWrapper.tsx`](../apps/web/src/components/ui/DataTableWrapper.tsx:1) — 715 строк.
- [`apps/web/src/components/ui/StatusBadge.tsx`](../apps/web/src/components/ui/StatusBadge.tsx:1) — 1210 строк.
- [`apps/web/src/theme/theme.ts`](../apps/web/src/theme/theme.ts:1) — quality checker даёт F из-за parser limitation, хотя файл не содержит функций.

Shared UI нельзя рефакторить механически: сначала зафиксировать public props, snapshot/RTL tests и все consumers.

#### P1.5 Packages
- [`packages/database/src/seed.ts`](../packages/database/src/seed.ts:1) — 967 строк; разбить на permission/role/demo-data seed modules.
- [`packages/auth/src/eps.test.ts`](../packages/auth/src/eps.test.ts:1) — 548 строк; разбить fixtures и suites без снижения покрытия.
- [`packages/shared/src/index.ts`](../packages/shared/src/index.ts:1) — 724 строки; разделить constants/types/formatters с сохранением barrel exports.

---

### P1 — типизация

В web-коде найдено широкое применение `any`, особенно в API filters, Jira adapters, report rows, WMS DTOs и setup state. План:

1. Ввести `unknown` на внешних JSON boundaries.
2. Добавить runtime schemas для request body/config (предпочтительно уже используемый в проекте подход; выбор библиотеки должен быть подтверждён зависимостями).
3. Типизировать Prisma `where`, integration config, Jira issue payloads и table row models.
4. Удалять `as any` только в bounded stories; не смешивать это с крупной UI-декомпозицией.
5. Добавить compile-time tests/tsc gates на критические adapters.

Приоритет: [`apps/web/src/lib/srm-providers`](../apps/web/src/lib/srm-providers), [`apps/web/src/lib/jira`](../apps/web/src/lib/jira), API WMS/EPS и reports.

---

### P2 — логирование и async discipline

В production-коде найдены многочисленные прямые `console.error/warn` и `.catch(console.error)`. Это не всегда баг, но нарушает единый operational logging и ухудшает контекст.

План:
- заменить серверные error paths на структурированный [`logger`](../apps/web/src/lib/logger.ts:1) с request/entity context;
- оставить console только внутри logger, CLI scripts и intentional error boundary logging;
- заменить `.catch(console.error)` на обработчик с пользовательским feedback либо явным best-effort комментарием;
- проверить fire-and-forget notifications и cleanup timers;
- добавить timeout/abort на внешние Jira/LDAP/REST calls.

---

### P2 — устаревшие артефакты и документация

1. [`docker/jira/server.ts`](../docker/jira/server.ts:1) и [`docker/jira/server.js`](../docker/jira/server.js:1) — намеренная TS/compiled JS пара, но нужен единый source-of-truth policy. Следующий агент должен проверить build/release workflow и либо генерировать JS только в build context, либо документировать исключение.
2. [`docs/JIRA_SRM_SETUP.md`](JIRA_SRM_SETUP.md:3) описывает `temp/`, реальные XML и команду `pnpm srm:import-jira`, которых следует подтвердить по manifests/scripts. Не удалять claims до сверки.
3. [`scripts/sync-legacy-import.js`](../scripts/sync-legacy-import.js:1) ссылается на legacy files в `temp/`; определить, используется ли он. Если нет — перенести в archived tooling или удалить после подтверждения history/операционного владельца.
4. [`scripts/update_feedback_schema.sql`](../scripts/update_feedback_schema.sql:1) — определить миграционный статус относительно Prisma migrations; после подтверждения убрать manual duplicate или добавить явное назначение.
5. Документация с датами 2023–2025 в demo fixtures не является автоматически устаревшей; обновлять только domain claims, а не test data без причины.

---

## 5. Предлагаемая очередность bounded stories

1. **Security defaults:** убрать hardcoded credentials, добавить negative tests и secret scan.
2. **Auth audit correctness:** вручную подтвердить 12 heuristic findings и object-level access.
3. **Tooling cleanup:** изменить `check:quality` на OS temp output и не загрязнять root.
4. **Setup/Admin decomposition:** отдельные PR/коммиты на каждый bounded area.
5. **WMS transaction/error review:** не менять UI до фиксации domain invariants.
6. **EPS import/report typing and decomposition.**
7. **Shared UI contracts and tests.**
8. **Packages seed/test/shared split.**
9. **Logging/timeout modernization.**
10. **Documentation and legacy script disposition.**

Каждая story должна иметь отдельный Conventional Commit по правилам [`AGENTS.md`](../AGENTS.md:12), проходить lint + tsc + targeted tests, а для security/API — полный test suite и route audit.

---

## 6. Ограничения и риски

- Quality checker считает 1 910 `magic_number` smell-записей; массовая замена чисел может ухудшить читаемость и поведение. Сначала выделять только domain constants.
- Некоторые F-grade оценки вызваны размером presentation-файла или ограничениями TSX parser; score нельзя использовать как единственное доказательство.
- `temp/` может содержать входные данные импорта/Jira и не должен удаляться агентом без явного подтверждения.
- Секреты в compose defaults — подтверждённая проблема, но их исправление затрагивает локальный onboarding; требуется миграционная инструкция для разработчиков.

---

## 7. Definition of Done для следующего общего baseline

- Git tree clean после удаления временных отчётов.
- `pnpm check:quality` не создаёт tracked/unwanted root artifacts.
- Web baseline: smells не более 2226 либо baseline пересмотрен с обоснованием; F-grade count не растёт.
- Все P0 security findings закрыты тестами.
- Lint, tsc, full tests, production build, theme check и route audit проходят.
- Документы отражают фактические команды, файлы и даты.
- Для каждой remaining finding указаны severity, owner-story, evidence, acceptance criteria и commit.
