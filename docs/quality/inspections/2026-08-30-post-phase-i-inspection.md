# EMS-Platform — повторная инспекция после Phase I (снимок 2026-08-30)

> **Неизменяемый снимок.** Этот отчёт фиксирует состояние проекта на `46aaa40`
> после завершения историй Phase I. Актуальные вычисляемые метрики не
> дублируются: см. [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md),
> [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md) и
> [`plans/README.md`](../../../plans/README.md).

**Дата:** 2026-08-30  
**Ветка / HEAD:** `main` / `46aaa40` (локальная ветка опережала `origin/main` на 20 коммитов)  
**Скилл:** [`code-reviewer`](../../../.agents/skills/code-reviewer/SKILL.md),
[`universal.md`](../../../.agents/skills/code-reviewer/rules/universal.md),
[`typescript.md`](../../../.agents/skills/code-reviewer/languages/typescript.md)  
**Правила:** [`AGENTS.md`](../../../AGENTS.md),
[`security.md`](../../../.agents/rules/security.md),
[`code_quality.md`](../../../.agents/rules/code_quality.md),
[`ui_design_code.md`](../../../.agents/rules/ui_design_code.md)

> **Вердикт: ❌ Request changes.**
> Security, route audit, UI theme gate, web lint, web TypeScript check, tests,
> dependency audit and quality thresholds проходят. Merge/build gate не зелёный:
> монорепозиторный build падает при генерации деклараций `@ems/auth`.
> Дополнительно выявлены high-severity DOM XSS в печатной форме и сломанные
> относительные ссылки в последних закрытых story.

---

## 1. Выполненные проверки

| Проверка | Результат |
|---|---|
| `node scripts/check-quality-baseline.mjs --report` | ✅ PASS; обновлён [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md) |
| `python scripts/route_audit.py --report` | ✅ PASS по rate-limit; эвристические auth-находки без изменений, см. [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md) |
| `node scripts/check-theme-tokens.mjs` | ✅ PASS, хардкод hex вне разрешённых theme-файлов не найден |
| `node scripts/plans-index.mjs --check` | ✅ PASS |
| `pnpm test` | ✅ 160 passed, 0 failed |
| `pnpm --filter @ems/web lint` | ✅ 0 warnings / errors; есть предупреждение об устаревании `next lint` |
| `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` | ✅ PASS |
| `pnpm audit --prod` | ✅ известных уязвимостей нет |
| `pnpm build` | ❌ FAIL: `@ems/auth` declaration build, TS2742 |
| `node scripts/check-doc-links.mjs` | ❌ FAIL: 26 сломанных ссылок в story I1–I8 |
| `git diff --check` | ✅ PASS |

Тестовый раннер в начале прогона вывел ошибку подключения к внешней БД
`10.0.0.5:5432`, но все тесты завершились успешно за несколько секунд. Это не
падение тестов, однако внешний connection attempt остаётся шумом/зависимостью
окружения и должен быть проверен отдельно от unit-test gate.

---

## 2. Находки, отсортированные по severity

### HIGH — DOM XSS в печатной форме инвентаризации

[`InventoryCountSheetDialog.tsx`](../../../apps/web/src/components/wms/InventoryCountSheetDialog.tsx)
собирает HTML-шаблон строковой интерполяцией и передаёт его в
`document.write()`. В шаблон без HTML-экранирования попадают поля из данных:
название/артикул/категория/единица номенклатуры, адрес ячейки, склад, МОЛ,
инициатор и комментарий. Достаточно значения вида `<img src=x onerror=...>`,
чтобы выполнить код в открытом окне при печати.

**Доказательство:** генерация строк начинается в
[`handlePrintSheet()`](../../../apps/web/src/components/wms/InventoryCountSheetDialog.tsx:154),
интерполяции — в строках 166–172 и 295–302, sink —
[`document.write()`](../../../apps/web/src/components/wms/InventoryCountSheetDialog.tsx:349).

**Требуемое исправление:** вынести HTML-экранирование в чистую функцию,
экранировать каждое текстовое поле до интерполяции либо строить DOM через
`textContent`; добавить регрессионный тест со строками `<script>`, кавычками и
`&`. До исправления считать печать инвентаризации небезопасной для
недоверенных/импортированных данных.

### HIGH — монорепозиторный build не проходит

`pnpm build` падает в `@ems/auth` с TS2742 для двух экспортируемых функций:

- [`createInternalServiceRequest()`](../../../apps/web/src/lib/jira/service-requests.ts:118)
- [`createMroWorkOrderFromIssue()`](../../../apps/web/src/lib/jira/service-requests.ts:164)

TypeScript не может сформировать переносимый declaration type без прямой ссылки
на вложенный Prisma runtime. Web `tsc --noEmit` этого не ловит, потому что
проблема проявляется при `declaration: true` в
[`packages/auth/tsconfig.json`](../../../packages/auth/tsconfig.json).

**Требуемое исправление:** задать явные публичные return-типы, не протекающие
через приватный путь `packages/database/node_modules`, либо исправить границы
пакета/tsconfig так, чтобы `@ems/auth` не компилировал web-исходники как часть
собственной declaration surface. Затем обязательно повторить полный
`pnpm build`.

### MEDIUM — documentation gate сломан для закрытых story I1–I8

[`check-doc-links.mjs`](../../../scripts/check-doc-links.mjs) обнаружил 26
невалидных ссылок в восьми story под
[`plans/done/2026-08/`](../../../plans/done/2026-08/). После перемещения из
`plans/active/` в `plans/done/2026-08/` ссылки вида `../../apps/...` и
`../../.agents/...` стали указывать внутрь `plans/` вместо корня репозитория.
Также ссылка на `PHASE-I-NOTES.md` использует неверную глубину.

Затронуты I1, I2, I3, I4, I5, I6, I7 и I8. Пример:
[`I8-login-page-perform-login.md`](../../../plans/done/2026-08/I8-login-page-perform-login.md:19).

**Требуемое исправление:** исправить относительные пути на `../../../apps/...`,
`../../../.agents/...` и `../../PHASE-I-NOTES.md`; затем добавить
`node scripts/check-doc-links.mjs` в обязательный pre-commit/CI gate, чтобы
перемещение story не могло оставить битые ссылки.

### MEDIUM — остаточная реальная сложность и крупные файлы

Текущий полный список F-grade файлов находится в выводе
[`fgrade_detail.py`](../../../scripts/fgrade_detail.py); текущие агрегаты —
только в [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md). Ручная проверка
показывает, что часть наиболее громких TSX-результатов является известным
ошибочным определением границы render-функции. Реальными приоритетами остаются:

1. `handleSubmit` в WMS warehouses — реальная сложность 16;
2. setup LDAP test handler — сложность 13;
3. WMS dashboard statistics loader — сложность 11;
4. `makeEnglishSlug` — сложность 14;
5. SRM/WMS dialog handlers с реальной сложностью выше нормативного порога.

Рефакторинг следует продолжать bounded-story подходом и приоритизировать
реальную бизнес-логику, а не presentation score.

### LOW — production UI всё ещё содержит прямые console-вызовы

Поиск нашёл прямые `console.error/warn` в UI/hooks/lib, включая
[`useWarehouseAccess.ts`](../../../apps/web/src/hooks/useWarehouseAccess.ts:54),
[`field-mapping.ts`](../../../apps/web/src/lib/jira/field-mapping.ts:179),
[`WmsOperationWizardDialog.tsx`](../../../apps/web/src/components/wms/WmsOperationWizardDialog.tsx:191)
и другие файлы. API-пути при этом чисты, а несколько console-вызовов являются
обоснованными sinks (`logger`, React error boundary). Остальные следует
мигрировать небольшими наборами на structured logger и/или пользовательский
error state, не массовой заменой.

### LOW — deprecated lint entry point

`next lint` успешно проходит, но Next.js предупреждает, что команда будет
удалена в Next.js 16. Следует запланировать переход на ESLint CLI до обновления
Next.js.

---

## 3. Положительная динамика после Phase I

По сравнению с предыдущим снимком
[`2026-08-30-inspection.md`](2026-08-30-inspection.md) качество улучшилось при
росте числа анализируемых файлов: средний балл вырос, количество F-grade,
smells и SOLID-нарушений снизилось. Точные текущие значения намеренно не
копируются сюда и доступны в сгенерированном
[`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md).

Закрытые Phase I декомпозиции снизили сложность в нескольких ранее
приоритетных участках. При этом inspection выявил, что локальные story gates
(`lint`, web `tsc`, tests, quality) недостаточны без полного monorepo build и
проверки документационных ссылок.

---

## 4. Security sign-off по обязательным правилам

- Route audit: rate-limit gaps отсутствуют; чувствительные маршруты покрыты.
- Webhook auth bypass pattern `provided && provided !== secret` не найден.
- LDAP escaping и RBAC-исключения остаются без новых регрессий по сравнению с
  предыдущей ручной проверкой.
- Raw SQL: только два разрешённых template-literal health-check запроса.
- `eval`, `new Function`, `@ts-ignore`, `@ts-expect-error`, `debugger` не найдены.
- `dangerouslySetInnerHTML` в ThemeRegistry остаётся контролируемым Emotion SSR
  sink; новая блокирующая находка относится к `document.write()` печатной формы.
- Production dependency audit: известных уязвимостей нет.

---

## 5. Рекомендуемый порядок исправлений

1. Исправить XSS в печатной форме и добавить регрессионный тест.
2. Восстановить полный monorepo build, закрыв TS2742 на public API SRM service requests.
3. Исправить ссылки в I1–I8 и сделать doc-link check обязательным gate.
4. Продолжить bounded-декомпозицию реальных функций с complexity > 10.
5. Запланировать миграцию с `next lint` и отдельные небольшие console-cleanup story.

После пунктов 1–3 повторить полный набор: quality report, route report, theme,
plans check, docs check, tests, web lint, web tsc, dependency audit,
monorepo build и `git diff --check`.

---

## 6. Итог

Проект демонстрирует положительную динамику качества и сохраняет сильные
security/UI автоматизированные гейты. Однако текущий HEAD нельзя одобрить для
merge/deploy: полный build не проходит, в печатном контуре есть DOM XSS, а
документационный gate красный. Вердикт остаётся **Request changes** до
устранения этих трёх блоков.
