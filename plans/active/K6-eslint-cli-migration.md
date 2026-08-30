---
id: K6
title: Перевести web lint с next lint на ESLint CLI
status: active
phase: K
priority: P3
risk: low
skills: [senior-frontend, ci-cd-pipeline-builder]
opened: 2026-08-30
closed: null
commits: []
gates: [lint, test, tsc, build, check:docs]
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

- [ ] `pnpm --filter @ems/web lint` не вызывает deprecated `next lint`.
- [ ] ESLint проверяет те же production source paths и проектные ограничения.
- [ ] Текущий код проходит lint без warnings/errors.
- [ ] Full gate green: lint, tests, web tsc, monorepo build и docs check.

## Result

Заполняется при закрытии story.
