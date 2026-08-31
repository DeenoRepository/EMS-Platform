# EMS-Platform — инспекция проекта и синхронизация документации (снимок 2026-08-31)

> **Неизменяемый снимок.** Фиксирует состояние проекта на `9b55615`.
> Актуальные вычисляемые метрики здесь не дублируются: см.
> [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md),
> [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md) и
> [`plans/README.md`](../../../plans/README.md).

**Дата:** 2026-08-31
**Ветка / HEAD:** `main` / `9b55615`
**Скилл:** [`code-reviewer`](../../../.agents/skills/code-reviewer/SKILL.md),
[`universal.md`](../../../.agents/skills/code-reviewer/rules/universal.md),
[`typescript.md`](../../../.agents/skills/code-reviewer/languages/typescript.md)
**Правила:** [`AGENTS.md`](../../../AGENTS.md),
[`security.md`](../../../.agents/rules/security.md),
[`code_quality.md`](../../../.agents/rules/code_quality.md),
[`ui_design_code.md`](../../../.agents/rules/ui_design_code.md)

> **Вердикт: ✅ Approve (после исправлений в этом коммите).**
> Исходный код регрессий не содержит: все прикладные гейты (lint, tsc, tests,
> build, audit, quality, theme, route audit) зелёные. Найденные дефекты
> относились к **инфраструктуре отчётности и документации** — они блокировали
> CI и вводили агентов в заблуждение. Все они устранены; изменений в
> прикладном коде `apps/` и `packages/` не потребовалось.

---

## 1. Выполненные проверки

| Проверка | Результат до инспекции | Результат после |
|---|---|---|
| `pnpm install --frozen-lockfile` | ✅ PASS (lockfile соответствует) | ✅ PASS |
| `pnpm db:generate` | ✅ PASS | ✅ PASS |
| `pnpm test` | ❌ FAIL: 27/27 файлов падали | ✅ PASS: 187 tests, 0 fail |
| `pnpm lint` | ✅ PASS | ✅ PASS |
| `pnpm --filter @ems/web exec tsc --noEmit` | ✅ PASS | ✅ PASS |
| `pnpm build` | ✅ PASS (4/4 задач) | ✅ PASS |
| `pnpm audit --audit-level=high` | ✅ No known vulnerabilities | ✅ PASS |
| `node scripts/check-quality-baseline.mjs` | ✅ PASS (все 8 порогов) | ✅ PASS |
| `node scripts/check-theme-tokens.mjs` | ✅ PASS | ✅ PASS |
| `node scripts/plans-index.mjs --check` | ✅ PASS | ✅ PASS |
| `python3 scripts/route_audit.py` | ✅ PASS (0 без rate-limit) | ✅ PASS |
| `node scripts/check-doc-links.mjs` | ❌ **FAIL: 4 битые ссылки** | ✅ PASS (94 файла) |
| Верификация генерируемых отчётов (`git diff --exit-code`) | ❌ **FAIL по дате** | ✅ PASS |
| Verify Script Syntax (`py_compile`) | ⚠️ загрязнял рабочее дерево | ✅ PASS, артефакты игнорируются |

---

## 2. Находки и их устранение

### 2.1 [BLOCKER] CI был красным: битые ссылки на `plans/active/`

`pnpm check:docs` — обязательный шаг
[`ci.yml`](../../../.github/workflows/ci.yml) — падал на 4 ссылках из
[`AGENTS.md`](../../../AGENTS.md),
[`code_quality.md`](../../../.agents/rules/code_quality.md),
[`REMEDIATION_PLAN.md`](../../REMEDIATION_PLAN.md) и
[`PHASE-I-NOTES.md`](../../../plans/PHASE-I-NOTES.md).

**Причина:** все 68 story закрыты, `plans/active/` опустел, а Git не хранит
пустые директории. Каталог исчез из индекса — вместе с ним «сломались» ссылки.

**Решение:** добавлен [`plans/active/.gitkeep`](../../../plans/active/.gitkeep)
с пояснением. Ссылки не удалялись: `plans/active/` — обязательная часть
жизненного цикла story по
[ADR-0001](../../architecture/decisions/0001-plans-directory-structure.md),
и каталог должен существовать. Тот же приём уже применён в репозитории для
`uploads/.gitkeep`.

### 2.2 [BLOCKER] CI ломался бы в любой день после коммита

Шаги «Verify … is up to date» регенерируют
[`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md) и
[`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md), затем выполняют
`git diff --exit-code`. Оба генератора подставляли `Measured at:` = *сегодня*,
поэтому при неизменном коде отчёт всё равно отличался от закоммиченного, и
сборка падала — исключительно из-за смены календарной даты. Воспроизведено:
diff состоял ровно из строки `-> Measured at: 2026-08-30` / `+ 2026-08-31`.

**Решение:** [`check-quality-baseline.mjs`](../../../scripts/check-quality-baseline.mjs)
и [`route_audit.py`](../../../scripts/route_audit.py) теперь сохраняют дату
предыдущего отчёта, если всё остальное содержимое совпадает, и обновляют её
только при реальном изменении метрик. Оба сценария проверены: при неизменных
входных данных `git diff --exit-code` чист, при подменённом значении метрики
дата корректно сдвигается на текущую.

### 2.3 [HIGH] Недокументированное предусловие `pnpm db:generate`

При чистом клоне `pnpm test` падал полностью: **27 из 27** файлов. После
установки зависимостей оставалось 12 падающих сюит с
`@prisma/client did not initialize yet`. Ни один markdown-файл репозитория не
упоминал `db:generate` (проверено `search_files` по `*.md` — 0 совпадений),
хотя CI этот шаг выполняет. Более того,
[`scripts/README.md`](../../../scripts/README.md) прямо утверждал, что гейты
«may be run locally without a database».

Это ловушка: агент, увидевший 12 падений, с высокой вероятностью начал бы
«чинить» тесты вместо запуска генерации клиента.

**Решение:** предусловие описано в
[`AGENTS.md`](../../../AGENTS.md) (новый раздел «Подготовка окружения») и в
[`scripts/README.md`](../../../scripts/README.md), с явным указанием, что такое
падение — ошибка окружения, а не регрессия. После `pnpm db:generate` — 187
тестов, 0 падений.

### 2.4 [MEDIUM] Повреждённая кодировка в story-файлах

[`K4`](../../../plans/done/2026-08/K4-complexity-remediation.md) и
[`K4.7`](../../../plans/done/2026-08/K4.7-eps-approvals-get-query.md) содержали
mojibake (UTF-8, прочитанный как cp1251): `РЎРЅРёР·РёС‚СЊ…` вместо
«Снизить…». Поскольку `plans-index.mjs` берёт заголовки из front-matter,
испорченный текст попадал и в генерируемый
[`plans/README.md`](../../../plans/README.md) — в две строки таблицы.

**Решение:** восстановлено 102 строки обратным преобразованием cp1251 → UTF-8;
индекс перегенерирован. Файлы в `plans/done/` считаются неизменяемыми, но
здесь правка не меняет смысл записи, а восстанавливает исходный текст,
сделав его читаемым. Остаточных повреждений не найдено.

### 2.5 [LOW] Устаревшие утверждения в `PHASE-I-NOTES.md`

Файл заявлял, что истории `I1`–`I8` находятся в `plans/active/` (все 8 давно
закрыты) и что `Sidebar.tsx` содержит 687 строк (фактически 635 после `K4.1`).

**Решение:** формулировки переписаны — файл описан как свод постоянных
предостережений, а не статус активной фазы; конкретное число строк убрано в
пользу ссылки, согласно правилу «никакой markdown-файл не хардкодит число,
которое вычисляется или живёт в другом месте». Полезное содержимое
(stop-file `Sidebar.tsx`, список false-positive checker'а) сохранено.

### 2.6 [LOW] CI-шаг загрязнял рабочее дерево

«Verify Script Syntax» выполняет `python3 -m py_compile scripts/*.py`, создавая
`scripts/__pycache__/`, который не был в `.gitignore`.

**Решение:** `__pycache__/` и `*.py[cod]` добавлены в
[`.gitignore`](../../../.gitignore).

---

## 3. Проверка соблюдения правил в коде

Прикладной код соответствует жёстким требованиям
[`AGENTS.md`](../../../AGENTS.md) — нарушений не обнаружено:

| Правило | Статус |
|---|---|
| Fail-closed webhook (`!providedToken \|\| …`) | ✅ соблюдено в [`route.ts:58`](../../../apps/web/src/app/api/srm/webhooks/[id]/route.ts:58) и закреплено тестом [`api-security.test.ts:159`](../../../apps/web/src/lib/__tests__/api-security.test.ts:159) |
| Rate limiting на чувствительных эндпоинтах | ✅ 0 из 85 route-файлов без rate-limit |
| Запрет hex-цветов в UI | ✅ `check-theme-tokens.mjs` PASS |
| Пороги качества | ✅ все 8 порогов PASS |

Эвристические находки route audit (2 роута без auth, 10 с `getCurrentUser()`
без RBAC) не изменились с прошлой инспекции и остаются известными
подтверждёнными исключениями — `login` и webhook аутентифицируются собственными
механизмами, `setup/*` работает до создания пользователей, `notifications/*` и
`files/*` ограничены владельцем. Это отражено в
[`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md).

---

## 4. Вывод

Кодовая база здорова: регрессий, уязвимостей и нарушений дизайн-кода не
выявлено, все прикладные гейты зелёные. Проблема была в **инфраструктуре
контроля**: два дефекта делали CI недостоверным (гарантированное падение по
дате и по исчезнувшему каталогу), а отсутствие описания `db:generate`
провоцировало ложный диагноз «сломанные тесты».

Изменения этой инспекции ограничены документацией, `.gitignore` и двумя
генераторами отчётов; `apps/` и `packages/` не затронуты.
