---
id: P4
title: Добавить явное закрытие поставленной заявки PRM
status: done
phase: P
priority: P1
risk: medium
skills: [senior-backend, senior-frontend, senior-qa]
opened: 2026-09-02
closed: 2026-09-02
commits: ["feat(prm): add explicit purchase request closure"]
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P4 — Добавить явное закрытие поставленной заявки PRM

## Problem

Статус `CLOSED` уже объявлен в
[`PurchaseRequestStatus`](../../../packages/database/prisma/schema.prisma:722), а
правила P2 требуют явного действия после `DELIVERED`. Однако текущая матрица
[`ALLOWED_TRANSITIONS`](../../../apps/web/src/lib/prm-requests-service.ts:71)
оставляла `DELIVERED` терминальным, существующие action routes охватывали только
submit/approve/reject/cancel, а
[`PrmRequestDetailsDialog()`](../../../apps/web/src/components/prm/PrmRequestDetailsDialog.tsx:23)
показывал действия приёмки, подачи, решения и отмены, но не закрытия. Полная
приёмка переводила заявку только в `DELIVERED` внутри
[`POST()`](../../../apps/web/src/app/api/prm/requests/[id]/deliveries/route.ts:208),
поэтому конечный статус `CLOSED` оставался недостижим.

## Scope

**Входит в scope:**

- Разрешить только явный переход `DELIVERED → CLOSED` в PRM.
- Добавить защищённый action route закрытия с идемпотентно-предсказуемым отказом
  для всех иных исходных статусов.
- Разрешить закрытие PRM-менеджеру/администратору и МОЛ целевого склада; не
  расширять право инициатора только на основании авторства заявки.
- Зафиксировать `closedAt` и `closedBy` для аудита и последующей аналитики P10,
  а также audit event и уведомление инициатору.
- Показать действие закрытия и факт закрытия в карточке заявки; обновить реестр
  после успеха.

**Не входит в scope:**

- Автоматическое закрытие при последней поставке.
- Повторное открытие `CLOSED`, корректировка поставок после закрытия или новый
  общий workflow engine.
- Изменение расчёта `receivedQty`, складских остатков или WMS-прихода.
- SLA/эскалации P7, многошаговое согласование P8 и консолидация P9.

## Steps

1. Расширить PRM-схему полями явного закрытия и версионированной миграцией,
   сохранив существующий enum статусов.
2. Добавить чистые правила перехода и авторизации `DELIVERED → CLOSED`, не
   разрешая иных выходов из terminal statuses.
3. Реализовать action route закрытия с `requireAuth`, rate limit, warehouse
   scoping, безопасными ошибками, аудитом и уведомлением.
4. Добавить в detail/list API сведения о закрытии без изменения доступа к заявке.
5. Добавить кнопку с подтверждением только для `DELIVERED` и только допустимым
   исполнителям; после успеха обновить карточку и реестр.
6. Покрыть service, route и component behavior тестами, включая пять обязательных
   осей write-route и отрицательные переходы.
7. Выполнить миграционные и полные quality/security gates; закрыть story одним
   Conventional Commit.

## Definition of Done

- [x] Единственный новый статусный переход — `DELIVERED → CLOSED`; `CLOSED`
      остаётся терминальным, а раннее закрытие возвращает validation error.
- [x] Успешное закрытие атомарно сохраняет `status`, `closedAt`, `closedBy`, audit
      event и создаёт уведомление инициатору, если исполнитель другой.
- [x] Закрыть заявку может PRM manager/admin или МОЛ её целевого склада; прочие
      пользователи получают 403.
- [x] Повторный запрос закрытия не меняет данные и возвращает документированный
      конфликт/validation response, а не создаёт повторный audit transition.
- [x] В UI действие видно только для `DELIVERED` и допустимой роли, требует
      подтверждения, а карточка отображает автора и дату закрытия.
- [x] Миграция применяется на чистой БД и БД с данными; `db push` не используется.
- [x] Новое и изменённое поведение покрыто исполняемыми тестами в том же коммите;
      write-route покрыт по success, validation, 401, 403 и persistence 500,
      тесты проверены на падение при регрессии согласно
      [`.agents/rules/testing.md`](../../../.agents/rules/testing.md).
- [x] Пороги покрытия и quality baseline не понижены; full gate green.
- [x] Story закрыта одним Conventional Commit; функциональных зависимостей на
      P3 и P5–P10 нет, но поля закрытия становятся источником данных для [P10](../../active/P10-prm-procurement-analytics.md).

## Result

1. **Prisma Schema & Миграция**:
   - В модель `PurchaseRequest` добавлены поля [`closedAt`](../../../packages/database/prisma/schema.prisma:738) (`DateTime?`) и [`closedById`](../../../packages/database/prisma/schema.prisma:739) (`String?`) со связью `closedBy` к `User`.
   - Создана версионированная SQL-миграция [`packages/database/prisma/migrations/20260902153000_prm_explicit_close_workflow/migration.sql`](../../../packages/database/prisma/migrations/20260902153000_prm_explicit_close_workflow/migration.sql:1), протестированная на чистой БД и БД со схемами предыдущих миграций.

2. **Доменные сервисы & Transition Matrix**:
   - В [`ALLOWED_TRANSITIONS`](../../../apps/web/src/lib/prm-requests-service.ts:71) добавлен переход `DELIVERED: ['CLOSED']`. Статус `CLOSED` остаётся строго терминальным (`[]`).
   - Функция [`closePurchaseRequest()`](../../../apps/web/src/lib/prm-requests-service.ts:413) инкапсулирует валидацию перехода, проверку прав (PRM Manager / Admin / МОЛ целевого склада), атомарное обновление в Prisma-транзакции с записью AuditLog `PURCHASE_REQUEST_CLOSED` и создание уведомления автору заявки.
   - Запросы поставок на закрытые заявки в [`recordPurchaseRequestDelivery()`](../../../apps/web/src/lib/prm-requests-service.ts:333) валидируются и отклоняются со статусом 400 (`Request is already closed`).

3. **API Action Route**:
   - Создан маршрут [`POST()`](../../../apps/web/src/app/api/prm/requests/[id]/close/route.ts:25) с `requireAuth(req, PERMISSIONS.PRM_APPROVE, PERMISSIONS.WMS_RECEIVE)`, `enforceRateLimit()`, `safeErrorResponse()`, проверкой warehouse scope для роли МОЛ и возвратом `400` на некорректные статусы/повторные вызовы.
   - Маршруты [`GET /api/prm/requests`](../../../apps/web/src/app/api/prm/requests/route.ts:1) и [`GET /api/prm/requests/[id]`](../../../apps/web/src/app/api/prm/requests/[id]/route.ts:1) возвращают `closedAt` и `closedBy` (id, name, email).

4. **UI & Клиентские компоненты**:
   - [`PrmRequestTableView`](../../../apps/web/src/components/prm/PrmRequestTableView.tsx:1) отображает кнопку «Закрыть» для заявок в статусе `DELIVERED` при наличии прав и выводит информацию о закрытии в строках таблицы.
   - [`PrmRequestDetailsDialog`](../../../apps/web/src/components/prm/PrmRequestDetailsDialog.tsx:1) дополнен кнопкой закрытия с модальным подтверждением `ConfirmDialog` и блоком метаданных закрытия (`closedAt`, `closedBy`).
   - Главная страница [`apps/web/src/app/prm/page.tsx`](../../../apps/web/src/app/prm/page.tsx:1) обрабатывает действие закрытия через `handleCloseRequest`, обновляет локальное состояние и перезапрашивает актуальный реестр.

5. **Гарантии конкурентности (Concurrency)**:
   - В тесте [`prm-delivery-close-concurrency.test.ts`](../../../apps/web/src/lib/__tests__/prm-delivery-close-concurrency.test.ts:1) проверена защита от race condition между регистрацией поставки и закрытием заявки, а также отклонение попыток параллельной или последующей доставки на закрытую заявку.

6. **Red-Green Evidence**:
   - *Red Phase*: Тесты `prm-request-transitions-routes.test.ts`, `prm-delivery-route.test.ts`, `prm-requests-service.test.ts`, `PrmRequestDetailsDialog.test.tsx`, `PrmRequestTableView.test.tsx` и `page.test.tsx` падали при отсутствии маршрута `/close`, отсутствии связи `closedBy`, попытке закрыть заявку не из `DELIVERED`, отказе прав у чужого склада и незащищённой поставке.
   - *Green Phase*: После реализации сервиса, транзакции, API route и UI-компонентов все 38 тест-сьютов (196 тестов) проходят успешно.
   - *Regression Verification*: Проверено падение тестов при модификации перехода матрицы и снятии блокировки закрытия.

7. **Верификация качества и гейтов**:
   - `lint`, `tsc`, `test` — 100% green.
   - `route-test-coverage` — 100% маршрутов покрыты тестами (124/124).
   - `check-static-security-policies` — все политики безопасности пройдены.
   - `check-theme-tokens` — хардкод цветов и стилей отсутствует.
   - Покрытие кода зафиксировано в [`docs/quality/COVERAGE_BASELINE.md`](../../../docs/quality/COVERAGE_BASELINE.md).
