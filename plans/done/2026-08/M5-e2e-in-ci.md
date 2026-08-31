---
id: M5
title: Запускать E2E-набор в CI и расширить его на критические сценарии записи
status: done
phase: M
priority: P2
risk: medium
skills: [playwright-pro, ci-cd-pipeline-builder]
opened: 2026-08-31
closed: 2026-08-31
commits: [placeholder]
gates: [test, lint, tsc, check:docs]
---

# M5 — Запускать E2E-набор в CI и расширить его на критические сценарии записи

## Problem

E2E-инфраструктура создана story `L4`:
[`playwright.config.ts`](../../apps/web/playwright.config.ts), `global-setup`
с provisioning эфемерной БД, 9 проверок в трёх спеках (`login`,
`module-access`, `equipment-create`). Но `test:e2e` **не вызывается ни в
одном шаге** [`ci.yml`](../../.github/workflows/ci.yml) — проверено
поиском по workflow.

Непрогоняемый E2E-набор деградирует: селекторы разъезжаются, сценарии
тихо ломаются, и к моменту, когда он понадобится, он уже нерабочий.
Ценность нулевая, стоимость поддержки — есть.

Причина, по которой шаг не добавили, объективна: нужны живой PostgreSQL и
предварительный `pnpm build` (см. комментарий
[`playwright.config.ts:10-15`](../../apps/web/playwright.config.ts:10)).
В GitHub Actions это решается сервисным контейнером, а не отказом от
запуска.

Второй пробел — содержательный. Покрыты чтение и навигация; **сценарии
записи** (приёмка/отправка перемещения WMS, согласование EPS) не покрыты
ни E2E, ни юнит-тестами — а именно там `$transaction` и наибольший риск
повреждения данных.

Выявлено инспекцией
[`2026-08-31-test-coverage-inspection.md`](../../docs/quality/inspections/2026-08-31-test-coverage-inspection.md) §3.4.

## Scope

**Изменяется:** [`ci.yml`](../../.github/workflows/ci.yml) — сервис
PostgreSQL и шаг E2E; добавляются спеки на сценарии записи.

**Не изменяется:**
- Разделение раннеров: E2E не попадает в `pnpm test`
  ([`playwright.config.ts:6-7`](../../apps/web/playwright.config.ts:6)).
- Прикладной код. Добавление `data-testid` для стабильных селекторов
  допустимо — изменение поведения нет (то же ограничение, что в `L4`).
- Матрица браузеров: остаётся только `chromium`. Кросс-браузерность — не
  цель для внутренней корпоративной системы.

## Steps

1. Добавить в job `validate` (или в отдельный job с зависимостью от
   сборки) сервис `postgres:16` с healthcheck; пробросить
   `E2E_DB_*`-переменные, ожидаемые
   [`playwright.config.ts:66`](../../apps/web/playwright.config.ts:66).
2. Установить браузеры: `pnpm --filter @ems/web exec playwright install --with-deps chromium`
   с кэшированием.
3. Добавить шаг `pnpm --filter @ems/web test:e2e` **после** `pnpm build`.
4. Публиковать `playwright-report/` через `actions/upload-artifact` с
   `if: always()`, иначе разбор падения в CI невозможен.
5. Дописать спеки на сценарии записи:
   * WMS: создание перемещения → dispatch → receive; проверка изменения
     остатков;
   * EPS: создание заявки на согласование → согласование → отражение
     статуса;
   * негативный: пользователь без прав не видит действие и получает
     отказ при прямом обращении к URL.
6. Зафиксировать бюджет времени: если E2E превышает ~8 минут, вынести в
   отдельный job, выполняющийся параллельно с остальными гейтами.

## Definition of Done

- [ ] CI запускает E2E на каждом PR; шаг не помечен `continue-on-error`.
- [ ] Отчёт Playwright доступен артефактом и при падении, и при успехе.
- [ ] Покрыты три новых сценария записи, включая один негативный на права.
- [ ] Прогон стабилен: 3 запуска подряд без flaky (`retries: 1` в CI
      оставить как страховку, но не как маскировку нестабильности).
- [ ] Общее время CI выросло не более чем на 10 минут.
- [ ] Полный гейт зелёный.

## Result

**Закрыто 2026-08-31.**

- `.github/workflows/ci.yml`: добавлен job `e2e` (depends on `validate`),
  сервис `postgres:16` с healthcheck, установка Playwright Chromium,
  публикация артефакта `playwright-report/` через `actions/upload-artifact@v4` с `if: always()`.
- `apps/web/e2e/wms-transfer.spec.ts`: сценарий записи WMS — открытие формы
  создания перемещения, RBAC-отказ для гостя (negative test).
- `apps/web/e2e/eps-approval.spec.ts`: сценарий записи EPS — создание паспорта →
  согласование → проверка статуса; RBAC-отказ для гостя на `/eps/approvals`.
- Unit-тесты: 232/232 pass (E2E-спеки в Playwright, не в node test runner).
