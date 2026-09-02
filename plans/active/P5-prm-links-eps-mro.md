---
id: P5
title: Показать связи PRM с оборудованием EPS и графиками MRO
status: active
phase: P
priority: P2
risk: medium
skills: [senior-backend, senior-frontend, senior-qa]
opened: 2026-09-02
closed: null
commits: []
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P5 — Показать связи PRM с оборудованием EPS и графиками MRO

## Problem

Модель PRM уже хранит необязательные `equipmentId` и
`maintenanceScheduleId` и отношения в
[`PurchaseRequest`](../../packages/database/prisma/schema.prisma:681). API создания
принимает эти поля в [`createSchema`](../../apps/web/src/app/api/prm/requests/route.ts:109),
а detail API выбирает оборудование и график в
[`GET()`](../../apps/web/src/app/api/prm/requests/[id]/route.ts:17). Однако
[`PrmRequestDetailsDialog()`](../../apps/web/src/components/prm/PrmRequestDetailsDialog.tsx:22)
не отображает ни одну из этих связей, а list include не выбирает
`maintenanceSchedule` в
[`requestInclude`](../../apps/web/src/app/api/prm/requests/route.ts:20).

С обратной стороны паспорт EPS уже маршрутизирует operational tabs через
[`TAB_KEY_MAP`](../../apps/web/src/app/eps/[id]/page.tsx:159), но
[`EquipmentOperationalTabs()`](../../apps/web/src/components/eps/EquipmentOperationalTabs.tsx:20)
показывает только ЗИП, MRO, SRM и историю. MRO реестр загружает графики через
[`GET()`](../../apps/web/src/app/api/mro/schedules/route.ts:11) и отображает их в
[`MroRegistryContent`](../../apps/web/src/app/mro/page.tsx:78), но не показывает
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

- [ ] Карточка PRM показывает существующую связь с EPS и/или MRO и ведёт на
      `/eps/<equipmentId>` и на MRO реестр с точным schedule filter/deep link.
- [ ] Паспорт EPS содержит PRM tab, который показывает только связанные заявки,
      доступные текущему пользователю по PRM scoping; отсутствие PRM permission
      не раскрывает данные.
- [ ] MRO строка/деталь показывает связанные PRM заявки и открывает их через
      canonical PRM deep link, определённый [P3](../done/2026-09/P3-fix-prm-notification-navigation.md).
- [ ] Создание из EPS/MRO предзаполняет только source context; пользователь явно
      выбирает/подтверждает склад, позиции, количества и отправку.
- [ ] Сервер отклоняет несуществующие source IDs и пару schedule/equipment,
      которая не соответствует фактической связи MRO.
- [ ] Фильтры `equipmentId` и `maintenanceScheduleId` не обходят warehouse/
      requester visibility; это доказано handler test, а не проверкой текста.
- [ ] Новое и изменённое поведение покрыто исполняемыми тестами в том же коммите,
      проверенными на падение при регрессии по
      [`.agents/rules/testing.md`](../../.agents/rules/testing.md).
- [ ] Используются существующие компоненты `@/components/ui`, статусы через
      `StatusBadge`, без новых hardcoded hex в `sx`.
- [ ] Пороги покрытия/quality baseline не понижены; full gate green.
- [ ] Story закрыта одним Conventional Commit; зависит от [P3](../done/2026-09/P3-fix-prm-notification-navigation.md),
      не зависит от P4/P6–P10 и предоставляет source dimensions для [P10](P10-prm-procurement-analytics.md).

## Result
