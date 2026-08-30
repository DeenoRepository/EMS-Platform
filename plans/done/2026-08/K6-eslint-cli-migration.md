---
id: K6
title: Перевести web lint с next lint на ESLint CLI
status: done
phase: K
priority: P3
risk: low
skills: [senior-frontend, ci-cd-pipeline-builder]
opened: 2026-08-30
closed: 2026-08-30
commits: [769b3a5]
gates: [lint, test, tsc, build, check:docs, plans:check]
---

# K6 — Перевести web lint с next lint на ESLint CLI

## Problem

[`apps/web/package.json`](../../apps/web/package.json:9) использует `next lint`.
Next.js 15 предупреждает, что команда будет удалена в Next.js 16. Без миграции
следующее major-обновление сделает lint gate несовместимым.

## Scope

- Перевести package script на ESLint CLI с эквивалентным охватом web source.
- Сохранить текущую Next.js/TypeScript конфигурацию и проектные restricted-import
  правила дизайн-системы.
- Обновить CI/документацию только там, где команда вызывается напрямую.
- Не обновлять Next.js/React/ESLint major versions в этой story.

## Steps

1. Проверить текущую конфигурацию [`apps/web/.eslintrc.json`](../../apps/web/.eslintrc.json).
2. Выбрать CLI-команду, покрывающую `.js`, `.jsx`, `.ts`, `.tsx` без `.next` и
   generated outputs.
3. Заменить script и проверить отсутствие изменения набора правил.
4. Обновить связанные инструкции/CI references при необходимости.
5. Запустить lint локально и в полном monorepo gate.

## Definition of Done

- [x] `pnpm --filter @ems/web lint` не вызывает deprecated `next lint`.
- [x] ESLint проверяет `src` с расширениями `.js`, `.jsx`, `.ts`, `.tsx`; ESLint defaults исключают generated outputs.
- [x] Текущий код проходит lint без warnings/errors.
- [x] Full gate green: lint, tests, web tsc, monorepo build, docs check и plans check.

## Result

- Updated only [`apps/web/package.json`](../../apps/web/package.json:9): `lint` now runs `eslint src --ext .js,.jsx,.ts,.tsx`.
- Preserved [`apps/web/.eslintrc.json`](../../apps/web/.eslintrc.json:1) unchanged, including `next/core-web-vitals`, restricted MUI imports, and `no-console` policy.
- No direct current CI or documentation command reference required updating; CI continues to invoke the package/monorepo lint scripts.
- Verification passed: web lint, full monorepo lint, 187 tests, web TypeScript check, monorepo build, docs links, and plans check.
