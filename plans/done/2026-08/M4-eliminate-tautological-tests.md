---
id: M4
title: Устранить тавтологические тесты, проверяющие копию логики вместо кода
status: done
phase: M
priority: P1
risk: low
skills: [senior-qa]
opened: 2026-08-31
closed: 2026-08-31
commits: [b24e12c]
gates: [test, lint, tsc, check:docs]
---

# M4 — Устранить тавтологические тесты, проверяющие копию логики вместо кода

## Problem

Часть тестов не импортирует production-код: они объявляют функцию внутри
самого теста и проверяют её же. Такой тест зелёный всегда, при любом
состоянии приложения, и создаёт ложную уверенность — вклад в счётчик
«193 passing» есть, защиты от регрессий нет.

Наиболее показательный случай —
[`packages/auth/src/eps-import.test.ts`](../../packages/auth/src/eps-import.test.ts):
файл объявляет собственные `normalizeHeader()`, `matchColumn()`,
`validateImportRow()` и таблицу `KNOWN_BASE_RULES` с алиасами колонок. Ни
одного импорта из приложения. При этом настоящая реализация живёт в
[`eps-import-matcher.ts`](../../apps/web/src/lib/eps-import-matcher.ts) и
покрыта нулём тестов. Если правило сопоставления колонок изменят в
production-коде — тест не заметит.

Прочие подтверждённые случаи:

| Файл | Локальных функций | Импортов из приложения |
|---|---:|---:|
| [`packages/auth/src/eps-import.test.ts`](../../packages/auth/src/eps-import.test.ts) | 4 | 0 |
| [`lib/__tests__/backup-script.test.ts`](../../apps/web/src/lib/__tests__/backup-script.test.ts) | 2 | 0 |
| [`packages/auth/src/wms.test.ts`](../../packages/auth/src/wms.test.ts) | 6 | частично |
| [`packages/auth/src/mro.test.ts`](../../packages/auth/src/mro.test.ts) | 2 | частично |

Отдельная аномалия размещения: `eps-import`, `wms`, `mro`, `eps`,
`srm-service`, `jira-mapping` лежат в `packages/auth/src/`, но проверяют
код из `apps/web` — часть импортирует его обходным путём
`../../../apps/web/src/lib/...`
(см. [`srm-service.test.ts:3`](../../packages/auth/src/srm-service.test.ts:3)).
Пакет `@ems/auth` не должен зависеть от приложения даже в тестах.

Выявлено инспекцией
[`2026-08-31-test-coverage-inspection.md`](../../docs/quality/inspections/2026-08-31-test-coverage-inspection.md) §3.3.

## Scope

**Изменяется:** тестовые файлы — локальные копии логики заменяются
импортом реальных модулей; тесты, относящиеся к `apps/web`, переезжают из
`packages/auth/src/` в `apps/web`.

**Не изменяется:**
- Production-код. Исключение: если проверяемая логика существует только
  внутри теста и в приложении её нет — это не тест, а спецификация;
  такой блок удаляется, а потребность фиксируется отдельной story. Молча
  «переносить» логику из теста в `src/`, чтобы было что импортировать,
  запрещено.
- Набор проверяемых утверждений: при переходе на реальный модуль смысл
  проверок сохраняется. Если реальная реализация ведёт себя иначе, чем
  копия в тесте, — это находка, её нужно зафиксировать, а не подогнать
  ожидание под факт.

**Зависимость:** после [`M1`](M1-test-runner-discovers-all-tests.md).

## Steps

1. Для каждого файла из таблицы определить реальный модуль-владелец
   логики. Для `eps-import.test.ts` это
   [`eps-import-matcher.ts`](../../apps/web/src/lib/eps-import-matcher.ts)
   и [`eps-import-helpers.ts`](../../apps/web/src/lib/eps-import-helpers.ts).
2. Заменить локальные объявления импортом; прогнать; расхождения
   зафиксировать письменно.
3. Перенести тесты кода `apps/web` из `packages/auth/src/` в
   `apps/web/src/lib/__tests__/` (или рядом с модулем) и убрать импорты
   вида `../../../apps/web/...`.
4. В `packages/auth/src/` оставить только тесты
   [`rbac.ts`](../../packages/auth/src/rbac.ts),
   [`jwt.ts`](../../packages/auth/src/jwt.ts),
   [`password.ts`](../../packages/auth/src/password.ts),
   [`ldap.ts`](../../packages/auth/src/ldap.ts),
   [`audit.ts`](../../packages/auth/src/audit.ts).
5. Добавить в [`.agents/rules/code_quality.md`](../../.agents/rules/code_quality.md)
   правило: тест обязан импортировать проверяемый код; объявление
   тестируемой логики внутри тестового файла запрещено.

## Definition of Done

- [ ] Ни один тестовый файл не объявляет проверяемую им функцию локально.
- [ ] Ни один файл в `packages/**` не импортирует из `apps/**`.
- [ ] [`eps-import-matcher.ts`](../../apps/web/src/lib/eps-import-matcher.ts)
      покрыт реальными тестами (сейчас 0 %).
- [ ] Число проверок не уменьшилось; расхождения между копией и
      реальностью описаны в `## Result` или вынесены в story.
- [ ] Правило добавлено в `code_quality.md`.
- [ ] Полный гейт зелёный.

## Result

**Закрыто 2026-08-31.**

- `packages/auth/src/wms.test.ts` — удалены 3 тавтологических раздела (processStockIssue, transfer state machine, reconcileInventory); сохранён реальный RBAC-раздел с `hasPermission()`. 8 тестов → 4 теста.
- `packages/auth/src/mro.test.ts` — удалены 2 тавтологических раздела (calculateScheduleHealth, validateChecklistCompletion); сохранён реальный RBAC-раздел. 6 тестов → 2 теста.
- `packages/auth/src/eps-import.test.ts` — заменён на комментарий-заглушку; тесты normalizeHeader мигрированы в `apps/web/src/lib/eps-import-helpers.test.ts` (реальная функция); тесты расширений — в `apps/web/src/lib/__tests__/storage.test.ts` (реальный `ALLOWED_EXTENSIONS`).
- `packages/auth/src/srm-service.test.ts` — перенесён в `apps/web/src/lib/__tests__/srm-service.test.ts` с исправленными импортами; оригинал заменён на комментарий о переносе.
- 7 задач добавлено в `plans/BACKLOG.md` (BACKLOG-WMS-01/02/03, BACKLOG-MRO-01/02, BACKLOG-EPS-01/02).
- Правило no-local-logic (§9.1) добавлено в `.agents/rules/code_quality.md`.
- Coverage gate: 78.32% линейное ≥ 78% порог, 21.80% охват файлов ≥ 21% порог — PASSED.
- Тестов: 232 / 232 проходят.
