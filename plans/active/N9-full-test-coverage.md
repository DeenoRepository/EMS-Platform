---
id: N9
title: Увеличить покрытие проекта тестами до полного охвата критических путей
status: active
phase: N
priority: P1
risk: medium
skills: [senior-qa]
opened: 2026-08-31
closed: null
commits: []
gates: [test, coverage, lint, tsc, docs]
---

# N9 — Увеличить покрытие проекта тестами до полного охвата критических путей

## Problem

Текущий baseline в [`docs/quality/COVERAGE_BASELINE.md`](../../docs/quality/COVERAGE_BASELINE.md) показывает 83.00% line coverage среди загруженных Node-тестами файлов, 55.41% file-level reach и 2.63% component line coverage. При этом 165 из 370 production-файлов не загружаются тестами. Компонентный runner расширен за пределы `components/ui`, но доменные React-компоненты всё ещё покрыты точечно.

## Scope

Постепенно покрыть тестами production-код монорепозитория без изменения бизнес-контрактов:

- unit-тесты чистой логики, shared/auth/database helpers и сервисов;
- executable contract-тесты API-роутов с RBAC, rate-limit, validation, error paths и Prisma mocks;
- React component-тесты критических UI-сценариев через Testing Library;
- Playwright E2E для критических read/write пользовательских потоков;
- усиление coverage-gates и актуализация generated baseline после каждого измеримого этапа.

Не входит: тестирование внешних систем в реальном окружении, требование 100% покрытия автоматически сгенерированных типов Prisma, миграций и деклараций, а также подмена интеграционных тестов статическим анализом.

## Steps

1. Зафиксировать воспроизводимое окружение: Node из [`.nvmrc`](../../.nvmrc), frozen lockfile и generated Prisma Client.
2. Снять baseline Node, Vitest component и Playwright suites; сохранить failures как environment или product defects.
3. Составить inventory production-файлов и приоритетов: security/auth/API, domain services, pure logic, UI, E2E.
4. Закрыть pure-logic и shared/auth/database helpers с branch/error-case тестами.
5. Закрыть API route contracts и чувствительные security paths executable-тестами.
6. Расширять React component suite по критическим страницам и reusable UI primitives.
7. Расширить E2E до основных EPS/WMS/MRO/SRM read/write сценариев и стабилизировать fixtures.
8. Поднять пороги coverage ratchet по фактическим приростам и запретить регрессии.
9. После каждого логического этапа выполнить test, coverage, lint, typecheck и docs gates; зафиксировать результат отдельным Conventional Commit.

## Definition of Done

- [ ] Все критические security/auth/API/domain paths имеют executable-тесты для success, validation, authorization и failure cases.
- [ ] Все reusable UI primitives и критические пользовательские формы имеют Testing Library coverage.
- [ ] Основные EPS/WMS/MRO/SRM read/write сценарии проходят в Playwright на изолированной БД.
- [ ] Покрытие измеряется отдельно для Node, компонентов и E2E; thresholds повышены до согласованных целевых значений без снижения baseline.
- [ ] Нет placeholder или тавтологических тестов; каждый тест проверяет наблюдаемое поведение.
- [ ] Full gate green: `pnpm test`, `node scripts/check-coverage.mjs`, `pnpm lint`, typecheck, docs и Playwright smoke.

## Result

Текущий измеримый результат после N9 phases 1–5:

- 86 Node test files, 478 assertions/checks, 0 failures.
- 13 Vitest component test files, 65 tests, 0 failures.
- Node line coverage: 83.00%; Node file-level reach: 55.41%.
- Component line coverage: 2.63%.
- Quality, lint, typecheck and docs gates pass.

Story остаётся активной: следующий приоритет — увеличить component coverage
критических доменных форм и закрыть оставшиеся динамические API/read-write
flows, не снижая текущие coverage thresholds.
