---
id: P5
title: Показать связи PRM с оборудованием EPS и графиками MRO
status: done
phase: P
priority: P2
risk: medium
skills: [senior-backend, senior-frontend, senior-qa]
opened: 2026-09-02
closed: 2026-09-03
commits: ["feat(prm): link purchase requests to EPS and MRO"]
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P5 — Показать связи PRM с оборудованием EPS и графиками MRO

## Problem

Модель PRM уже хранит необязательные `equipmentId` и
`maintenanceScheduleId` и отношения в
[`PurchaseRequest`](../../../packages/database/prisma/schema.prisma:681). API создания
принимает эти поля в [`createSchema`](../../../apps/web/src/app/api/prm/requests/route.ts:109),
а detail API выбирает оборудование и график в
[`GET()`](../../../apps/web/src/app/api/prm/requests/[id]/route.ts:17). Однако
[`PrmRequestDetailsDialog()`](../../../apps/web/src/components/prm/PrmRequestDetailsDialog.tsx:22)
не отображает ни одну из этих связей, а list include не выбирает
`maintenanceSchedule` в
[`requestInclude`](../../../apps/web/src/app/api/prm/requests/route.ts:20).

С обратной стороны паспорт EPS уже маршрутизирует operational tabs через
[`TAB_KEY_MAP`](../../../apps/web/src/app/eps/[id]/page.tsx:159), но
[`EquipmentOperationalTabs()`](../../../apps/web/src/components/eps/EquipmentOperationalTabs.tsx:20)
показывает только ЗИП, MRO, SRM и историю. MRO реестр загружает графики через
[`GET()`](../../../apps/web/src/app/api/mro/schedules/route.ts:11) и отображает их в
[`MroRegistryContent`](../../../apps/web/src/app/mro/page.tsx:78), но не показывает
связанные закупочные заявки. Фактически сохранённые связи не доступны
пользователю для навигации и контроля контекста.

## Scope

**Входит в scope:**

- Показывать в карточке PRM связанные EPS equipment и MRO maintenance schedule с
  навигацией на существующие страницы/фильтры.
- Добавить в паспорт оборудования отдельный bounded PRM operational tab со
  scoped списком заявок, связанных по `equipmentId`.
- Добавить к строкам/деталям MRO графика признак и переход к связанным PRM
  заявкам по `maintenanceScheduleId`.
- Расширить существующий PRM list query точными фильтрами `equipmentId` и
  `maintenanceScheduleId`, сохраняя текущий warehouse/requester scoping.
- Разрешить создание PRM из контекста EPS/MRO через query-prefill существующего
  мастера, но окончательный склад и позиции остаются явно подтверждаемыми.

**Не входит в scope:**

- Автоматическое создание заявки из EPS/MRO.
- Изменение схемы отношений, удаление `SetNull` или создание новых сущностей.
- Изменение MRO execution, WMS receipt, согласований или статусов PRM.
- Единая cross-module search page или новый универсальный linking framework.

## Steps

1. Расширить parser/where model PRM точными source-фильтрами и проверить, что они
   объединяются с существующим RBAC/warehouse scope через `AND`, а не заменяют его.
2. Дополнить list/detail DTO минимальными полями EPS/MRO, необходимыми для
   подписей и ссылок, без выдачи лишних данных.
3. Добавить в PRM details кликабельные source cards для существующих связей и
   предсказуемое отсутствие блока для null-связей.
4. Добавить PRM tab в паспорт EPS, обновив tab key/index mapping и загрузку
   связанных заявок через существующий PRM API.
5. Добавить в MRO table/detail affordance для связанных заявок и deep link в PRM
   реестр по `maintenanceScheduleId`.
6. Поддержать prefill `equipmentId`/`maintenanceScheduleId` в текущем PRM wizard,
   валидируя существование и согласованность schedule с equipment на сервере.
7. Покрыть where model, API scoping, EPS/MRO navigation и wizard prefill
   исполняемыми тестами; выполнить все gates и закрыть одним коммитом.

## Definition of Done

- [x] Карточка PRM показывает существующую связь с EPS и/или MRO и ведёт на
      `/eps/<equipmentId>` и на MRO реестр с точным schedule filter/deep link.
- [x] Паспорт EPS содержит PRM tab, который показывает только связанные заявки,
      доступные текущему пользователю по PRM scoping; отсутствие PRM permission
      не раскрывает данные.
- [x] MRO строка/деталь показывает связанные PRM заявки и открывает их через
      canonical PRM deep link, определённый [P3](P3-fix-prm-notification-navigation.md).
- [x] Создание из EPS/MRO предзаполняет только source context; пользователь явно
      выбирает/подтверждает склад, позиции, количества и отправку.
- [x] Сервер отклоняет несуществующие source IDs и пару schedule/equipment,
      которая не соответствует фактической связи MRO.
- [x] Фильтры `equipmentId` и `maintenanceScheduleId` не обходят warehouse/
      requester visibility; это доказано handler test, а не проверкой текста.
- [x] Новое и изменённое поведение покрыто исполняемыми тестами в том же коммите,
      проверенными на падение при регрессии по
      [`.agents/rules/testing.md`](../../../.agents/rules/testing.md).
- [x] Используются существующие компоненты `@/components/ui`, статусы через
      `StatusBadge`, без новых hardcoded hex в `sx`.
- [x] Пороги покрытия/quality baseline не понижены; full gate green.
- [x] Story закрыта одним Conventional Commit; зависит от [P3](P3-fix-prm-notification-navigation.md),
      не зависит от P4/P6–P10 и предоставляет source dimensions для [P10](../../active/P10-prm-procurement-analytics.md).

## Result

1. **Решение без миграций БД (No-Migration Decision)**:
   - Модель [`PurchaseRequest`](../../../packages/database/prisma/schema.prisma:681) уже содержала необходимые поля `equipmentId` (`String?`), отношение `equipment` (`Equipment?`), `maintenanceScheduleId` (`String?`) и отношение `maintenanceSchedule` (`MaintenanceSchedule?`) с правилом каскада `onDelete: SetNull`.
   - Структура схемы полностью покрывает требования связности; создание новых миграций или изменение схемы БД не потребовалось.

2. **Source-фильтры и сохранение RBAC/Warehouse Scoping**:
   - Вспомогательный парсер [`parsePurchaseRequestGetQuery()`](../../../apps/web/src/app/api/prm/requests/get-query.ts:1) принимает параметры `equipmentId` и `maintenanceScheduleId`.
   - Функция [`applySourceFilter()`](../../../apps/web/src/lib/prm-request-where-model.ts:60) встраивает source-фильтры в Prisma `where` объект. Фильтры строго объединяются через логическое `AND` с существующими условиями видимости складов МОЛ и прав пользователя в [`buildPurchaseRequestWhereModel()`](../../../apps/web/src/lib/prm-request-where-model.ts:98).
   - В эндпоинте [`POST()`](../../../apps/web/src/app/api/prm/requests/route.ts:1) реализована валидация существования указанных сущностей и проверка согласованности пары: если передан `maintenanceScheduleId`, связанный с ним `equipmentId` обязан совпадать с переданным `equipmentId`.

3. **Вкладка PRM в паспорте оборудования EPS и Privacy/RBAC Policy**:
   - Паспорт оборудования [`apps/web/src/app/eps/[id]/page.tsx`](../../../apps/web/src/app/eps/[id]/page.tsx:1) расширен вкладкой `prm` с регистрацией в `TAB_KEY_MAP`.
   - Разработан компонент [`EquipmentPrmTab`](../../../apps/web/src/components/eps/EquipmentPrmTab.tsx:1), запрашивающий заявки по текущему `equipmentId` через защищённый API.
   - Политика конфиденциальности: при отсутствии у пользователя права `PERMISSIONS.PRM_READ` или при отсутствии видимых заявок для его складов/ролей вкладка возвращает безопасное пустое состояние без утечки коммерческих или закупочных данных. Из вкладки доступна кнопка инициации заявки с предзаполнением текущего оборудования.

4. **Интеграция с MRO реестром и Schedule Deep Link**:
   - Маршрут [`GET /api/mro/schedules`](../../../apps/web/src/app/api/mro/schedules/route.ts:1) дополнен выборкой связанных заявок `purchaseRequests`.
   - В [`MroSchedulesTable`](../../../apps/web/src/components/mro/MroSchedulesTable.tsx:1) добавлен индикатор наличия связанных заявок со ссылкой на отфильтрованный PRM реестр.
   - На странице [`apps/web/src/app/mro/page.tsx`](../../../apps/web/src/app/mro/page.tsx:1) поддержан параметр `?scheduleId=...`, обеспечивающий точечную прокрутку, раскрытие и подсветку целевого графика ТО при переходе из карточки PRM.

5. **PRM Детали и Мастер создания**:
   - В диалоге [`PrmRequestDetailsDialog`](../../../apps/web/src/components/prm/PrmRequestDetailsDialog.tsx:1) добавлены интерактивные карточки источников: переход на паспорт EPS (`/eps/<equipmentId>`) и переход на график MRO (`/mro?scheduleId=<maintenanceScheduleId>`). При отсутствии связей блок скрыт.
   - Мастер создания [`PrmRequestWizardDialog`](../../../apps/web/src/components/prm/PrmRequestWizardDialog.tsx:1) и функция отправки [`submitPurchaseRequestWizard()`](../../../apps/web/src/components/prm/prm-wizard-submit.ts:1) поддерживают prefill параметров `equipmentId` и `maintenanceScheduleId`. При этом склад назначения, перечень позиций и количества остаются объектом явного подтверждения пользователя.

6. **Red-Green Evidence & Тестирование**:
   - *Red Phase*: Тесты в [`prm-request-where-model.test.ts`](../../../apps/web/src/lib/__tests__/prm-request-where-model.test.ts:1), [`prm-requests-routes.test.ts`](../../../apps/web/src/lib/__tests__/prm-requests-routes.test.ts:1), [`EquipmentPrmTab.test.tsx`](../../../apps/web/src/components/eps/EquipmentPrmTab.test.tsx:1), [`EquipmentPassportTabs.test.tsx`](../../../apps/web/src/components/eps/EquipmentPassportTabs.test.tsx:1), [`PrmRequestDetailsDialog.test.tsx`](../../../apps/web/src/components/prm/PrmRequestDetailsDialog.test.tsx:1), [`PrmRequestWizardDialog.test.tsx`](../../../apps/web/src/components/prm/PrmRequestWizardDialog.test.tsx:1) и [`apps/web/src/app/mro/page.test.tsx`](../../../apps/web/src/app/mro/page.test.tsx:1) падали при отсутствии source-фильтрации в `where`, нарушении scoping складов, рассогласовании `equipmentId` и `maintenanceScheduleId`, отсутствии вкладки PRM в паспорте EPS и отсутствии обработки deep link в MRO.
   - *Green Phase*: После реализации валидаторов, модели where, UI-вкладок и навигации все тесты проходят успешно.
   - *Regression Verification*: Проверено падение тестов при модификации логики объединения `AND` в `prm-request-where-model.ts` и при отключении кросс-валидации schedule-equipment.
