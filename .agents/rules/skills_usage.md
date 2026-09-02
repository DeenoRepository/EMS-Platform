# Правила использования специализированных скиллов и процесса разработки в EMS-Platform

> Обновлено: 2026-08-30 (структурная реорганизация отчётности)
> Полный список обязательных правил (git commit, UI, security, quality
> thresholds): [`AGENTS.md`](../../AGENTS.md) — не дублируется здесь.

---

## Жизненный цикл задачи (story) и отчётность

Все задачи по улучшению/рефакторингу проекта отслеживаются в
[`plans/`](../../plans/), а не в единой длинной инструкции или чек-листе.

1. **Создание.** Новая задача — новый файл
   `plans/active/<id>-<slug>.md`, созданный из шаблона
   [`plans/templates/story.md`](../../plans/templates/story.md). Обязательные
   поля front-matter: `id, title, status, phase, priority, risk, skills,
   opened, closed, commits, gates`.
2. **Работа.** Один файл = одна story = один Conventional Commit при
   закрытии. Не смешивать security-фикс, логирование и UI-декомпозицию в
   одной story.
3. **Закрытие.** Установить `status: done`, заполнить `closed:` и
   `commits:`, описать реальный результат в разделе **Result** файла, затем
   `git mv` файл в `plans/done/YYYY-MM/`.
4. **Регенерация индекса.** После любого изменения story-файла — обязательно
   `node scripts/plans-index.mjs`. Этот скрипт — единственный писатель
   [`plans/README.md`](../../plans/README.md); руками этот файл не
   редактируется.
5. **Незапланированная работа.** Условные/отложенные задачи — в
   [`plans/BACKLOG.md`](../../plans/BACKLOG.md), не в `active/`.

**Правило отчётности:** ни в одном markdown-файле не должно быть числа или
статуса, который уже вычисляется скриптом или хранится в одном
конкретном файле. Текущие метрики качества — только в
[`docs/quality/QUALITY_BASELINE.md`](../../docs/quality/QUALITY_BASELINE.md)
(генерируется `node scripts/check-quality-baseline.mjs --report`). Статус
задач — только в [`plans/README.md`](../../plans/README.md) (генерируется
`node scripts/plans-index.mjs`). Именно дублирование этих чисел в 5+
местах привело к рассинхронизации, устранённой этой реорганизацией.

---

## Использование специализированных скиллов (`.agents/skills/*`)

При выполнении задач в данном репозитории агент ОБЯЗАН обращаться к
соответствующим локальным скиллам.

### 1. Фронтенд и компоненты интерфейса (Next.js 15 App Router, React 18, MUI v5)
* **`senior-frontend`**: страницы `apps/web/src/app/`, компоненты `apps/web/src/components/`, оптимизация рендеринга таблиц и графиков.
* **`a11y-audit`**: аудит доступности форм (паспорта оборудования, складские накладные, ТО).

### 2. Бэкенд, API, PostgreSQL и Prisma ORM
* **`senior-backend`**: эндпоинты `apps/web/src/app/api/`, серверная логика, транзакции, оптимизация запросов.
* **`strict-api`**: строгая валидация DTO, обработка ошибок, защита API-контрактов.
* **`database-schema-designer`**: расширение `packages/database/prisma/schema.prisma`, планирование миграций.

### 3. Авторизация, безопасность и аудит
* **`senior-security`**: LDAP-аутентификация, JWT, RBAC, webhook-безопасность, threat modeling.
* **`senior-secops`**: SAST-сканирование, vulnerability management, compliance (SOC2, GDPR), CI/CD security gates.

> ⚠️ **Важно**: при работе с `packages/auth`, webhook-эндпоинтами или любым кодом авторизации — **обязательно** сверяться с [`.agents/rules/security.md`](security.md).

### 4. Тестирование и обеспечение качества (QA & E2E)
* **`senior-qa`**: модульные и интеграционные тесты для `packages/` и `apps/web/src/lib/__tests__/`. Jest в проекте **не используется**: логика и API-роуты тестируются через `node:test` + `tsx` (`pnpm test`), React-компоненты — через Vitest + Testing Library. Скилл написан в терминах Jest — его рецепты применять с поправкой на фактический раннер.
* **`playwright-pro`**: E2E-тесты пользовательских сценариев (жизненный цикл оборудования, согласования, инвентаризация) с архитектурой Page Object Model.

> ⚠️ Обязанность покрывать новый код тестами и критерий пригодности теста —
> [`.agents/rules/testing.md`](testing.md).

### 5. Архитектура и надёжность
* **`senior-architect`**: добавление новых пакетов в монорепозиторий, проектирование связей между модулями, ADR-документы (см. [`docs/architecture/decisions/`](../../docs/architecture/decisions/)).
* **`zero-hallucination-coder`**: точное соответствие кодовой базе, TypeScript-типам и ТЗ без выдумывания невалидных интерфейсов.
* **`code-reviewer`**: предварительный самоанализ написанного кода, запуск `code_quality_checker.py` перед коммитом.

### 6. Инфраструктура и интеграции
* **`docker-development`**: Dockerfile, docker-compose.yml, конфигурация окружения.
* **`ci-cd-pipeline-builder`**: настройка и поддержка CI/CD пайплайнов.
* **`jira-expert`**: доработка модуля SRM, REST API интеграции с Jira, кэширование тикетов.
* **`handoff`**: фиксация состояния контекста задач между сессиями агентов.
* **`self-improving-agent`**: сохранение проектных соглашений и паттернов в долгосрочную память.

---

## Архитектура проекта (краткая справка)

```
EMS-Platform/                    ← Monorepo (pnpm workspaces)
├── apps/
│   └── web/                     ← Next.js 15 App Router (TypeScript + MUI v5)
│       └── src/
│           ├── app/             ← Страницы и API Routes
│           │   ├── api/         ← Backend API (auth, eps, wms, srm, mro, admin)
│           │   ├── eps/         ← Модуль управления оборудованием
│           │   ├── wms/         ← Складской учёт
│           │   ├── srm/         ← Управление заявками (Jira/Redmine/GitLab)
│           │   ├── mro/         ← Техническое обслуживание
│           │   └── admin/       ← Администрирование
│           ├── components/
│           │   ├── ui/          ← Shared UI library (AGENTS.md §2)
│           │   ├── eps/         ← EPS-специфичные компоненты
│           │   ├── wms/         ← WMS-специфичные компоненты
│           │   └── srm/         ← SRM-специфичные компоненты
│           └── lib/             ← Утилиты, auth-guard, rate-limit, etc.
├── packages/
│   ├── auth/                    ← JWT, LDAP, RBAC, пароли, аудит
│   ├── database/                ← Prisma schema + seed
│   └── shared/                  ← Типы, PERMISSIONS, константы
├── plans/                       ← Work ledger (active / done / backlog)
└── .agents/
    ├── rules/                   ← Правила для агентов
    └── skills/                  ← Специализированные скиллы
```

---

## Контакты и актуальность

* **Текущие задачи**: [`plans/README.md`](../../plans/README.md)
* **Текущие метрики качества**: [`docs/quality/QUALITY_BASELINE.md`](../../docs/quality/QUALITY_BASELINE.md)
* **История инспекций**: [`docs/quality/inspections/`](../../docs/quality/inspections/)
* **Схема БД**: [`docs/architecture/DATABASE_TOPOLOGY.md`](../../docs/architecture/DATABASE_TOPOLOGY.md)
* **Деплой**: [`docs/operations/PRODUCTION_DEPLOYMENT.md`](../../docs/operations/PRODUCTION_DEPLOYMENT.md)
* **Полный индекс документации**: [`docs/README.md`](../../docs/README.md)
