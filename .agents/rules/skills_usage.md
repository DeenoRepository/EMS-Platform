# Правила использования специализированных скиллов и процесса разработки в EMS-Platform

> Обновлено: 2026-08-27 (по результатам аудита)  
> Полный список правил: [`AGENTS.md`](../../AGENTS.md)

---

## 🚨 Обязательные правила разработки

### 1. Фиксация изменений (Git Commit)
* **После успешного завершения любой задачи, фичи, фикса или логического этапа агент ОБЯЗАН создать Git-коммит.**
* Коммиты должны быть атомарными, содержать понятный заголовок по стандарту Conventional Commits:
  - `feat: <описание>` — добавление нового функционала
  - `fix: <описание>` — исправление ошибок
  - `refactor: <описание>` — оптимизация структуры без изменения поведения
  - `test: <описание>` — добавление тестов
  - `docs: <описание>` — обновление документации
  - `chore: <описание>` — правка конфигураций, зависимостей, скиллов

### 2. Единый дизайн-код (Запрет хардкода UI)

Детальные правила: [`.agents/rules/ui_design_code.md`](ui_design_code.md)

Кратко:
* Использовать только компоненты из `@/components/ui`: `StatCard`, `StatusBadge`, `SearchInput`, `FilterToolbar`, `EmptyState`, `DataTableWrapper`, `ConfirmDialog`
* **Запрещены hex-цвета** в `sx={}` пропах — только `theme.palette.*` токены
* **Запрещён `<Chip>`** для статусов — только `<StatusBadge>`

### 3. Безопасность (по результатам аудита 2026-08-27)

Детальные правила: [`.agents/rules/security.md`](security.md)

Ключевые требования:
* **Webhook auth**: `if (!providedToken || providedToken !== secret)` — НЕ `if (provided && provided !== secret)`
* **Rate limiting** на всех чувствительных эндпоинтах через `enforceRateLimit()`
* **RBAC** через `requireAuth(req, PERMISSIONS.*)` на каждом API-роуте
* **Нет raw SQL** — только Prisma ORM
* **LDAP**: всегда `escapeLdapFilter()` перед подстановкой

### 4. Качество кода

Детальные правила: [`.agents/rules/code_quality.md`](code_quality.md)

Пороги:
| Метрика | Лимит |
|---|---|
| Длина функции | ≤ 50 строк |
| Цикломатическая сложность | ≤ 10 |
| Размер файла | ≤ 500 строк |
| Параметры функции | ≤ 5 |
| Вложенность | ≤ 4 уровня |

---

## Использование специализированных скиллов (`.agents/skills/*`)

При выполнении задач в данном репозитории агент ОБЯЗАН обращаться к соответствующим локальным скиллам.

### 1. Фронтенд и компоненты интерфейса (Next.js 14, React 18, MUI v5)
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
* **`senior-qa`**: модульные и интеграционные тесты (Jest, React Testing Library) для `packages/auth` и `apps/web/src/lib/__tests__/`.
* **`playwright-pro`**: E2E-тесты пользовательских сценариев (жизненный цикл оборудования, согласования, инвентаризация) с архитектурой Page Object Model.

### 5. Архитектура и надёжность
* **`senior-architect`**: добавление новых пакетов в монорепозиторий, проектирование связей между модулями, ADR-документы.
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
│   └── web/                     ← Next.js 14 App Router (TypeScript + MUI v5)
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
└── .agents/
    ├── rules/                   ← Правила для агентов
    └── skills/                  ← Специализированные скиллы
```

---

## Контакты и актуальность

* **Аудит кода**: [`docs/CODE_REVIEW_AUDIT.md`](../../docs/CODE_REVIEW_AUDIT.md)
* **JSON-отчёт**: [`docs/code-review-report.json`](../../docs/code-review-report.json)
* **Схема БД**: [`docs/DATABASE_TOPOLOGY.md`](../../docs/DATABASE_TOPOLOGY.md)
* **Деплой**: [`docs/PRODUCTION_DEPLOYMENT.md`](../../docs/PRODUCTION_DEPLOYMENT.md)
