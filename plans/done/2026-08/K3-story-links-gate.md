---
id: K3
title: Исправить ссылки story I1–I8 и закрепить docs gate
status: done
phase: K
priority: P1
risk: medium
skills: [code-reviewer, ci-cd-pipeline-builder]
opened: 2026-08-30
closed: 2026-08-30
commits: [pending]
gates: [check:docs, plans:check, lint, tsc]
---

# K3 — Исправить ссылки story I1–I8 и закрепить docs gate

## Problem

[`check-doc-links.mjs`](../../../scripts/check-doc-links.mjs) сообщает о 26
сломанных ссылках в закрытых story I1–I8 под
[`plans/done/2026-08/`](./). Ссылки были корректны в
`plans/active/`, но после перемещения на два уровня глубже не были пересчитаны.
CI уже запускает docs check в [`ci.yml`](../../../.github/workflows/ci.yml:50),
поэтому текущий HEAD не проходит обязательный gate.

## Scope

- Исправить относительные ссылки в I1–I8 без изменения содержания/результатов
  закрытых story.
- Проверить все markdown-ссылки репозитория, а не только восемь файлов.
- Уточнить lifecycle/template guidance так, чтобы ссылки создавались с учётом
  будущего расположения `plans/done/YYYY-MM/`, либо добавить безопасную
  автоматизированную проверку до закрытия story.
- Не переписывать immutable inspection snapshots и не менять вычисляемые
  статусы вручную в `plans/README.md`.

## Steps

1. Исправить пути `../../apps`, `../../.agents` и ссылку на `PHASE-I-NOTES.md`.
2. Запустить `node scripts/check-doc-links.mjs` и устранить оставшиеся ошибки.
3. Проверить, что CI docs step является обязательным и выполняется до build.
4. Обновить story template/lifecycle guidance минимальным изменением,
   предотвращающим повторение ошибки при `git mv`.
5. Регенерировать `plans/README.md`, если менялись story front-matter.

## Definition of Done

- [x] `node scripts/check-doc-links.mjs` завершается PASS.
- [x] Все ссылки I1–I8 разрешаются из фактического done-каталога.
- [x] CI содержит обязательный docs link gate.
- [x] Story lifecycle документирует безопасный формат ссылок до перемещения.
- [x] Full gate green: docs check, plans index check, lint и web tsc.

## Result

- Исправлены относительные ссылки в закрытых story I1–I8 и остальных затронутых
  done-документах с учётом фактического уровня `plans/done/YYYY-MM/`.
- В [`ci.yml`](../../../.github/workflows/ci.yml:50) подтверждён обязательный
  docs gate, выполняемый до build.
- В [`story.md`](../../../plans/templates/story.md:42) добавлено правило пересчёта ссылок
  и запуска docs checker перед перемещением story в done-каталог.
- Проверки: docs links PASS (79 файлов), plans index check PASS, lint PASS,
  web tsc PASS.
