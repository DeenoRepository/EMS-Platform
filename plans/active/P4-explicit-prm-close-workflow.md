---
id: P4
title: Добавить явное закрытие поставленной заявки PRM
status: active
phase: P
priority: P1
risk: medium
skills: [senior-backend, senior-frontend, senior-qa]
opened: 2026-09-02
closed: null
commits: []
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P4 — Добавить явное закрытие поставленной заявки PRM

## Problem

Статус `CLOSED` уже объявлен в
[`PurchaseRequestStatus`](../../packages/database/prisma/schema.prisma:717), а
правила P2 требуют явного действия после `DELIVERED`. Однако текущая матрица
[`ALLOWED_TRANSITIONS`](../../apps/web/src/lib/prm-requests-service.ts:70)
оставляет `DELIVERED` терминальным, существующие action routes охватывают только
submit/approve/reject/cancel, а
[`PrmRequestDetailsDialog()`](../../apps/web/src/components/prm/PrmRequestDetailsDialog.tsx:22)
показывает действия приёмки, подачи, решения и отмены, но не закрытия. Полная
приёмка переводит заявку только в `DELIVERED` внутри
[`POST()`](../../apps/web/src/app/api/prm/requests/[id]/deliveries/route.ts:198),
поэтому предусмотренный конечный статус недостижим.

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

- [ ] Единственный новый статусный переход — `DELIVERED → CLOSED`; `CLOSED`
      остаётся терминальным, а раннее закрытие возвращает validation error.
- [ ] Успешное закрытие атомарно сохраняет `status`, `closedAt`, `closedBy`, audit
      event и создаёт уведомление инициатору, если исполнитель другой.
- [ ] Закрыть заявку может PRM manager/admin или МОЛ её целевого склада; прочие
      пользователи получают 403.
- [ ] Повторный запрос закрытия не меняет данные и возвращает документированный
      конфликт/validation response, а не создаёт повторный audit transition.
- [ ] В UI действие видно только для `DELIVERED` и допустимой роли, требует
      подтверждения, а карточка отображает автора и дату закрытия.
- [ ] Миграция применяется на чистой БД и БД с данными; `db push` не используется.
- [ ] Новое и изменённое поведение покрыто исполняемыми тестами в том же коммите;
      write-route покрыт по success, validation, 401, 403 и persistence 500,
      тесты проверены на падение при регрессии согласно
      [`.agents/rules/testing.md`](../../.agents/rules/testing.md).
- [ ] Пороги покрытия и quality baseline не понижены; full gate green.
- [ ] Story закрыта одним Conventional Commit; функциональных зависимостей на
      P3 и P5–P10 нет, но поля закрытия становятся источником данных для [P10](P10-prm-procurement-analytics.md).

## Result
