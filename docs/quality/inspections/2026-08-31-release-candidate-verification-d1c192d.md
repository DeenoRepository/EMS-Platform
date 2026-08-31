# EMS-Platform — верификация release candidate (снимок 2026-08-31, HEAD d1c192d)

> **Неизменяемый снимок.** Фиксирует полный прогон релизных гейтов на ветке
> `main` в состоянии `d1c192d`. Актуальные вычисляемые метрики находятся в
> [`QUALITY_BASELINE.md`](../QUALITY_BASELINE.md),
> [`COVERAGE_BASELINE.md`](../COVERAGE_BASELINE.md) и
> [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md).

**Дата:** 2026-08-31
**Ветка / HEAD:** `main` / `d1c192d`
**Окружение:** Node 24.15.0 (соответствует [`.nvmrc`](../../../.nvmrc)), pnpm 11.16.0, Windows 11
**Правила:** [`AGENTS.md`](../../../AGENTS.md)

> **Вердикт: ✅ RELEASE CANDIDATE.** Все автоматические гейты выполнены заново
> на текущем HEAD и пройдены. Развёртывание по-прежнему требует обычных
> релизных операций: production-секреты, TLS, резервное копирование и
> baseline миграций для БД, созданных до версионированных миграций.

---

## 1. Причина повторной верификации

Предыдущий снимок
[`2026-08-31-release-readiness-inspection.md`](2026-08-31-release-readiness-inspection.md)
вынес вердикт на HEAD `9056aa7`. После него в `main` вошли коммиты
`cd6143a`, `a413576`, `ec75aa8` и `d1c192d`. Коммит `ec75aa8` затронул
[`middleware.ts`](../../../apps/web/src/middleware.ts),
[`rate-limit.ts`](../../../apps/web/src/lib/rate-limit.ts) и роуты `api/setup/*`
— то есть ровно ту поверхность, которую покрывают E2E и security-гейты.
Поэтому вердикт прежнего снимка не переносится по наследству, и весь набор
проверок выполнен заново.

---

## 2. Выполненные гейты (прогон на d1c192d)

| Проверка | Команда | Итог |
|---|---|---|
| Установка зависимостей | `pnpm install --frozen-lockfile` | ✅ PASS |
| Генерация Prisma Client | `pnpm db:generate` | ✅ PASS |
| TypeScript | `tsc --noEmit` | ✅ PASS |
| ESLint + статические политики безопасности | `pnpm lint` | ✅ PASS |
| Unit / integration тесты | `pnpm test` | ✅ PASS: 59 файлов, 355 тестов, 0 падений |
| Компонентные тесты (Vitest + RTL) | `pnpm --filter @ems/web test:components` | ✅ PASS: 6 файлов, 38 тестов |
| Coverage gate | `node scripts/check-coverage.mjs` | ✅ PASS |
| Quality baseline | `pnpm check:quality` | ✅ PASS |
| Theme-token gate | `pnpm check:theme` | ✅ PASS |
| Документационные ссылки | `pnpm check:docs` | ✅ PASS: 122 файла |
| Индекс планов | `node scripts/plans-index.mjs` | ✅ PASS: 0 активных, 88 закрытых |
| Production build | `pnpm build` | ✅ PASS: 4/4 Turbo tasks, 33 страницы |
| Playwright E2E | `pnpm --filter @ems/web test:e2e` | ✅ PASS: 13/13 |
| Аудит зависимостей | `pnpm audit --audit-level high` | ✅ Уязвимостей не найдено |

### Coverage (порог / факт)

| Метрика | Факт | Порог |
|---|---:|---:|
| Line coverage среди загруженных файлов | 70.86 % | >= 70 % |
| File-level coverage | 22.97 % | >= 22 % |
| Component line coverage | 1.89 % | >= 1 % |

### E2E-сценарии

Playwright применил миграцию `20260831030000_init` на чистую БД и выполнил
13 сценариев: логин/логаут, доступ к EPS/WMS/MRO, создание паспорта
оборудования, полный цикл согласования EPS, форма перемещения WMS и четыре
проверки отказа доступа для непривилегированного пользователя.

---

## 3. Известные ограничения (не блокеры)

Ограничения не изменились относительно предыдущего снимка и приняты
осознанно:

- **File-level coverage низок по абсолютной величине** — 22.97 %, большинство
  production-файлов не импортируется unit-набором. Гейт защищает ratchet, но
  не означает исчерпывающего покрытия.
- **Component line coverage 1.89 %** — компонентное тестирование введено
  недавно (story M6/N6) и покрывает узкий срез библиотеки UI.
- **E2E WMS не покрывает полный цикл dispatch/receive** — стандартная фикстура
  не создаёт склады, номенклатуру и остатки; проверяется доступ к форме и RBAC.
- **22 F-grade файла в `apps/web/src`** при пороге 34 — технический долг в
  крупных TSX-модулях, baseline не регрессировал.
- **Route audit — эвристика**; известные исключения зафиксированы в
  [`SECURITY_BASELINE.md`](../SECURITY_BASELINE.md).
- **Docker-образ около 390 MB** и содержит полный workspace install;
  оптимизация до standalone-вывода Next.js — отдельная задача.

---

## 4. Условия развёртывания

Перед выкладкой обязательны стандартные релизные операции, не покрываемые
репозиторными гейтами:

1. Заменить все placeholder-секреты из
   [`.env.production.example`](../../../.env.production.example).
2. Настроить TLS и ingress согласно
   [`PRODUCTION_DEPLOYMENT.md`](../../operations/PRODUCTION_DEPLOYMENT.md).
3. Проверить резервное копирование и восстановление.
4. Для БД, созданных до версионированных миграций, выполнить documented
   baseline — иначе старт завершится ошибкой `P3005` (поведение fail-closed
   подтверждено ранее и сохранено).

---

## 5. Итог

На HEAD `d1c192d` проект проходит полный CI-эквивалентный набор гейтов,
включая production build и E2E против production-сборки. Блокирующих дефектов
кода или упаковки не обнаружено. Состояние помечается как release candidate.
