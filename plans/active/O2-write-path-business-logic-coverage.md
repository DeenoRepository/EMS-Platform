---
id: O2
title: Покрыть тестами write-роуты с необратимым бизнес-эффектом (WMS, EPS import, SRM sync)
status: active
phase: O
priority: P1
risk: high
skills: [senior-qa, senior-backend]
opened: 2026-09-01
closed: null
commits: []
gates: [test, coverage, lint, tsc]
---

# O2 — Покрыть тестами write-роуты с необратимым бизнес-эффектом

## Problem

Роуты, изменяющие складские остатки, статусы перемещений и импортирующие
данные из внешних систем, не имеют исполняемых контракт-тестов. Ошибка в
них не «показывает не то» — она портит данные необратимо:

| Роут | Бизнес-эффект |
|---|---|
| [`wms/transfers/[id]/dispatch`](../../apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts) | списание остатка отправителя |
| [`wms/transfers/[id]/receive`](../../apps/web/src/app/api/wms/transfers/[id]/receive/route.ts) | зачисление остатка получателю |
| [`wms/transfers/[id]/reject`](../../apps/web/src/app/api/wms/transfers/[id]/reject/route.ts) | возврат резерва |
| [`wms/stock/[id]/location`](../../apps/web/src/app/api/wms/stock/[id]/location/route.ts) | перемещение между ячейками |
| [`wms/inventories/[id]`](../../apps/web/src/app/api/wms/inventories/[id]/route.ts) | фиксация результатов инвентаризации |
| [`wms/nomenclature`](../../apps/web/src/app/api/wms/nomenclature/route.ts), [`nomenclature by id`](../../apps/web/src/app/api/wms/nomenclature/[id]/route.ts) | справочник, от которого зависят остатки |
| [`wms/warehouses`](../../apps/web/src/app/api/wms/warehouses/route.ts), [`warehouse by id`](../../apps/web/src/app/api/wms/warehouses/[id]/route.ts), [`warehouse zones`](../../apps/web/src/app/api/wms/warehouses/[id]/zones/route.ts) | топология склада |
| [`zone by id`](../../apps/web/src/app/api/wms/zones/[id]/route.ts), [`zone cells`](../../apps/web/src/app/api/wms/zones/[id]/cells/route.ts) | адресация хранения |
| [`eps/import/analyze`](../../apps/web/src/app/api/eps/import/analyze/route.ts) | предпросмотр импорта |
| [`eps/import/execute`](../../apps/web/src/app/api/eps/import/execute/route.ts) | массовое создание оборудования |
| [`eps/approvals/[id]`](../../apps/web/src/app/api/eps/approvals/[id]/route.ts) | смена статуса согласования |
| [`srm/sync`](../../apps/web/src/app/api/srm/sync/route.ts) | синхронизация инцидентов |
| [`srm/integrations/[id]/sync`](../../apps/web/src/app/api/srm/integrations/[id]/sync/route.ts) | то же на уровне интеграции |
| [`srm/issues/[id]/create-mro-order`](../../apps/web/src/app/api/srm/issues/[id]/create-mro-order/route.ts) | создание наряда MRO |
| [`mro/schedules`](../../apps/web/src/app/api/mro/schedules/route.ts) | планы ТО |

Существующие юнит-тесты
[`wms-transfers-service.test.ts`](../../apps/web/src/lib/wms-transfers-service.test.ts)
и [`wms-operations-service.test.ts`](../../apps/web/src/lib/wms-operations-service.test.ts)
покрывают сервисный слой, но не HTTP-контракт и не транзакционные
инварианты роутов.

## Scope

Исполняемые контракт-тесты для перечисленных write-роутов + проверка
доменных инвариантов через `$transaction`-мок.

Не входит: изменение бизнес-правил, схемы БД и формата ответов.
Тесты фиксируют текущее поведение как контракт.

## Инварианты, которые обязан проверить тест

1. **Неотрицательность остатка.** `dispatch` при недостатке количества
   возвращает 4xx и не вызывает `update` остатка.
2. **Атомарность.** Все мутации выполняются внутри одного
   `$transaction`; падение внутри коллбэка не оставляет частичных записей.
3. **Идемпотентность статусных переходов.** Повторный `receive` уже
   принятого перемещения возвращает 409/4xx, а не удваивает остаток.
4. **Валидность перехода статуса.** `reject` после `receive` запрещён.
5. **Аудит.** Каждая успешная мутация пишет запись через
   [`audit.ts`](../../packages/auth/src/audit.ts).
6. **RBAC.** Пользователь без `WMS_*`/`EPS_*`/`SRM_*` permission — 403.

## Steps

1. Расширить `makePrismaMock()` в
   [`route-harness.ts`](../../apps/web/src/lib/__tests__/helpers/route-harness.ts)
   счётчиками вызовов мутаций, чтобы можно было ассертить «не вызывалось».
2. Создать `wms-transfer-lifecycle-routes.test.ts`: полный цикл
   dispatch → receive и dispatch → reject, плюс все 6 инвариантов.
3. Создать `wms-stock-location-route.test.ts`: перемещение в
   несуществующую ячейку, в переполненную ячейку, успешный кейс.
4. Создать `wms-topology-routes.test.ts`: warehouses / zones / cells /
   nomenclature — CRUD, уникальность кодов, каскадные ограничения.
5. Создать `wms-inventory-routes.test.ts` для `wms/inventories/[id]`:
   фиксация расхождений, запрет правки закрытой инвентаризации.
6. Создать `eps-import-routes.test.ts`: `analyze` возвращает отчёт без
   мутаций; `execute` создаёт записи только для валидных строк и
   сообщает об отклонённых. Опереться на
   [`eps-import-helpers.test.ts`](../../apps/web/src/lib/eps-import-helpers.test.ts)
   и [`eps-import-matcher.test.ts`](../../apps/web/src/lib/eps-import-matcher.test.ts).
7. Создать `eps-approval-transition-route.test.ts` для `eps/approvals/[id]`.
8. Создать `srm-sync-routes.test.ts`: `srm/sync`,
   `srm/integrations/[id]/sync`, `srm/issues/[id]/create-mro-order` —
   успех, недоступный провайдер (без утечки токена в ответ), частичная
   синхронизация.
9. Создать `mro-schedules-route.test.ts`.
10. Поднять пороги до строки «После O2» [`O0`](O0-coverage-roadmap.md):
    line 74 / reach 40 / component 1.

## Definition of Done

- [ ] Все 17 перечисленных роутов имеют исполняемые тесты.
- [ ] Каждый инвариант 1–6 проверен минимум на одном роуте домена WMS.
- [ ] Есть негативный тест «мутация не вызывалась» для каждого
      отклонённого запроса (через счётчики мока).
- [ ] Ни один тест не подключается к PostgreSQL.
- [ ] Пороги подняты до 74/40/1, baseline перегенерирован.
- [ ] Full gate green: test, coverage, lint, tsc.

## Result

Заполняется при закрытии.
