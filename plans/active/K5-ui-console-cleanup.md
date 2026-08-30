---
id: K5
title: Заменить остаточные console-вызовы в UI и сервисах
status: active
phase: K
priority: P3
risk: low
skills: [senior-frontend, code-reviewer]
opened: 2026-08-30
closed: null
commits: []
gates: [test, lint, tsc, check:quality]
---

# K5 — Заменить остаточные console-вызовы в UI и сервисах

## Problem

В production UI/hooks/lib остаются прямые `console.error/warn`, например в
[`useWarehouseAccess.ts`](../../apps/web/src/hooks/useWarehouseAccess.ts:54),
[`field-mapping.ts`](../../apps/web/src/lib/jira/field-mapping.ts:179) и
[`WmsOperationWizardDialog.tsx`](../../apps/web/src/components/wms/WmsOperationWizardDialog.tsx:191).
API-пути уже очищены. Часть оставшихся вызовов является допустимым sink
структурированного logger или React error boundary и не должна удаляться
механически.

## Scope

- Сначала классифицировать все найденные console-вызовы: intentional sink,
  user-visible recoverable error, server/service diagnostic.
- Мигрировать только необоснованные вызовы bounded-наборами на shared logger,
  snackbar/error state или безопасное игнорирование с комментарием.
- Сохранить обоснованные console sinks в [`logger.ts`](../../apps/web/src/lib/logger.ts)
  и error boundary, если они являются последней линией диагностики.
- Не вводить новый logging framework и не смешивать cleanup с UI refactoring.

## Steps

1. Сформировать фиксированный список production-вызовов и исключений.
2. Разделить работу на небольшие batches по модулю/типу ошибки.
3. Для UI ошибок обеспечить пользовательское состояние, если его нет.
4. Для diagnostics использовать structured logger с контекстом без secrets.
5. Проверить отсутствие новых console-вызовов в изменённых областях.

## Definition of Done

- [ ] Каждый оставшийся console-вызов имеет документированное техническое
  обоснование либо находится внутри logger/error-boundary sink.
- [ ] Необоснованные UI/lib console-вызовы заменены bounded-изменениями.
- [ ] Ошибки не замалчиваются и secrets/PII не добавлены в лог-контекст.
- [ ] Full gate green: tests, lint, web tsc и quality baseline.

## Result

Заполняется при закрытии story.
