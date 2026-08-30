---
id: K1
title: Устранить DOM XSS в печатной форме инвентаризации
status: done
phase: K
priority: P0
risk: high
skills: [senior-security, senior-frontend, senior-qa]
opened: 2026-08-30
closed: 2026-08-30
commits: [pending]
gates: [test, lint, tsc, check:theme, check:quality, check:docs]
---

# K1 — Устранить DOM XSS в печатной форме инвентаризации

## Problem

[`InventoryCountSheetDialog.tsx`](../../../apps/web/src/components/wms/InventoryCountSheetDialog.tsx)
собирает HTML через строковую интерполяцию в
[`handlePrintSheet()`](../../../apps/web/src/components/wms/InventoryCountSheetDialog.tsx:154)
и передаёт результат в [`document.write()`](../../../apps/web/src/components/wms/InventoryCountSheetDialog.tsx:349).
Поля из номенклатуры, склада, МОЛ и комментариев не экранируются. Это позволяет
выполнить HTML/JS в новом окне печати через импортированные или иные
недоверенные значения.

## Scope

- Вынести безопасное HTML-экранирование текстовых значений в чистую локальную
  функцию или перейти на построение DOM через `textContent`.
- Применить защиту ко всем динамическим значениям в printable HTML, включая
  значения в атрибутах, если они появятся.
- Добавить регрессионные тесты для `<script>`, `<img ...>`, кавычек и `&`.
- Сохранить визуальный формат A4, CSV-экспорт и пользовательский сценарий печати.
- Не менять API, схему Prisma, права доступа и бизнес-правила инвентаризации.

## Steps

1. Зафиксировать все dynamic sinks внутри printable template.
2. Реализовать escaping с корректной обработкой `&`, `<`, `>`, `"` и `'`.
3. Использовать helper для всех пользовательских/импортированных строк.
4. Добавить unit-тесты на helper и тест, подтверждающий отсутствие исполняемых
   HTML-конструкций в сформированном документе.
5. Запустить security-focused tests и полный набор gates.

## Definition of Done

- [x] Недоверенные строки не интерпретируются как HTML/JS в окне печати.
- [x] Все dynamic HTML text sinks защищены или заменены на `textContent`.
- [x] Добавлены регрессионные тесты на XSS payloads и специальные символы.
- [x] Нет изменения пользовательского вида и CSV-поведения.
- [x] Full gate green: `pnpm test`, web lint, web tsc, theme, quality и docs checks.

## Result

- Вынесен минимальный helper [`escapeHtml()`](../../../apps/web/src/components/wms/inventory-count-sheet-print.ts:1), экранирующий `&`, `<`, `>`, `"` и `'`.
- Все динамические значения в printable HTML защищены перед передачей в [`document.write()`](../../../apps/web/src/components/wms/InventoryCountSheetDialog.tsx:359).
- CSV-экспорт сохранён с отдельным RFC-style quoting helper и не использует HTML escaping.
- Добавлены регрессионные unit-тесты в [`inventory-count-sheet-print.test.ts`](../../../apps/web/src/lib/__tests__/inventory-count-sheet-print.test.ts:1) для script/img payloads, кавычек, apostrophe, `&`, nullish и обычных значений.
- Проверки: `pnpm test` — 165/165; lint, web tsc, theme и quality — PASS.
- Docs gate теперь проходит после пересчёта ссылок для размещения story в done-каталоге; ранее существующие ошибки I1–I8 остаются областью K3.
