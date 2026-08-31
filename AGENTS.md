# Руководство для AI-агентов в проекте EMS-Platform

В данном проекте настроены специализированные скиллы и правила для разработки корпоративной системы управления оборудованием.

> **Версия правил:** 3.0 (2026-08-30 — реструктуризация отчётности и планирования)
> **Текущие задачи (активные / выполненные / backlog):** [`plans/README.md`](plans/README.md) (генерируется `node scripts/plans-index.mjs`)
> **Текущие метрики качества:** [`docs/quality/QUALITY_BASELINE.md`](docs/quality/QUALITY_BASELINE.md) (генерируется `node scripts/check-quality-baseline.mjs --report`)
> **История инспекций:** [`docs/quality/inspections/`](docs/quality/inspections/) (неизменяемые снимки по датам)
> **Полный индекс документации:** [`docs/README.md`](docs/README.md)

Это руководство — **точка входа**, а не исчерпывающий справочник. Конкретные
метрики, списки файлов и статусы задач сюда не копируются — они меняются
чаще, чем это руководство, и хранятся в файлах, указанных выше.

---

## ⚙️ Подготовка окружения (перед любыми проверками)

Используйте точную версию Node.js из [`.nvmrc`](.nvmrc). CI читает тот же
файл; запуск coverage-гейта на другой major запрещён, поскольку формат
экспериментального отчёта покрытия зависит от версии Node.js.

```bash
nvm use
pnpm install --frozen-lockfile
pnpm db:generate   # обязателен для pnpm test
```

`pnpm db:generate` только генерирует типы Prisma Client из схемы и **не**
подключается к базе. Без этого шага каждый тест, импортирующий
`@ems/database`, падает с `@prisma/client did not initialize yet` — это
ошибка окружения, а не регрессия кода. Не «чините» такие падения правкой
тестов. Полный список проверок и их предусловий —
[`scripts/README.md`](scripts/README.md).

---

## 🚨 Обязательные правила разработки (жёсткие запреты)

### 1. Фиксация изменений (Git Commit)
* **После каждой успешно выполненной задачи или логического этапа агент ОБЯЗАН выполнять Git-коммит.**
* Сообщение коммита — Conventional Commits на русском или английском языке:
  * `feat: ...` — новый функционал / компонент / модуль
  * `fix: ...` — исправление бага / ошибки
  * `refactor: ...` — оптимизация / рефакторинг без изменения функционала
  * `docs: ...` — документация / спецификации
  * `test: ...` — добавление или правка тестов
  * `chore: ...` — настройка конфигураций, зависимостей, скиллов
* Если коммит закрывает story из [`plans/active/`](plans/active/) — см.
  жизненный цикл story в
  [`.agents/rules/skills_usage.md`](.agents/rules/skills_usage.md).

### 2. Единый дизайн-код (Запрет хардкода UI)
* Все виджеты, панели инструментов и типовые элементы интерфейса
  ОБЯЗАНЫ использоваться из единой библиотеки `@/components/ui`
  (`StatCard`, `StatusBadge`, `SearchInput`, `FilterToolbar`, `EmptyState`,
  `DataTableWrapper`, `ConfirmDialog`).
* ❌ Запрещены разрозненные локальные стили статусов/KPI/поиска/таблиц.
* ❌ Запрещены hex-цвета в `sx={}` — только `theme.palette.*` / семантические токены.
* ❌ Запрещён `<Chip>` для статусов сущностей — только `<StatusBadge>`.
* Полные правила: [`.agents/rules/ui_design_code.md`](.agents/rules/ui_design_code.md).

### 3. Безопасность — обязательные требования
* **Webhook-эндпоинты**: если `webhookSecret` настроен, запрос без токена
  ОБЯЗАН быть отклонён (`401`): `if (!providedToken || providedToken !== webhookSecret)`,
  **не** `if (providedToken && providedToken !== webhookSecret)`.
* **Rate Limiting** обязателен на всех чувствительных эндпоинтах через
  `enforceRateLimit()` из `@/lib/rate-limit`.
* **RBAC**: каждый API-роут проверяет разрешение через
  `requireAuth(req, PERMISSIONS.*)` — голого `getCurrentUser()` недостаточно.
* **Нет raw SQL** — только типизированный Prisma ORM.
* **LDAP**: всегда `escapeLdapFilter()` перед подстановкой пользовательского ввода.
* Полные правила: [`.agents/rules/security.md`](.agents/rules/security.md).

### 4. Качество кода
* Пороги (длина функции, цикломатическая сложность, размер файла и т.д.) —
  в [`.agents/rules/code_quality.md`](.agents/rules/code_quality.md).
* Фактические текущие метрики — только в
  [`docs/quality/QUALITY_BASELINE.md`](docs/quality/QUALITY_BASELINE.md).
* Файлы с оценкой **F** подлежат обязательному рефакторингу перед слиянием
  в main; приоритет — по реальной цикломатической сложности, а не по score.

---

## Расположение скиллов

Все скиллы установлены в [`.agents/skills/`](.agents/skills) и содержат
структурированные инструкции (`SKILL.md`), справочные материалы
(`references/`) и инструменты автоматизации (`scripts/`).

## Правила выбора скиллов под задачу

1. **Frontend & UI** — [`.agents/skills/senior-frontend/`](.agents/skills/senior-frontend), [`.agents/skills/a11y-audit/`](.agents/skills/a11y-audit)
2. **Backend & Database** — [`.agents/skills/senior-backend/`](.agents/skills/senior-backend), [`.agents/skills/strict-api/`](.agents/skills/strict-api), [`.agents/skills/database-schema-designer/`](.agents/skills/database-schema-designer)
3. **Безопасность** — [`.agents/skills/senior-security/`](.agents/skills/senior-security), [`.agents/skills/senior-secops/`](.agents/skills/senior-secops)
4. **Тестирование** — [`.agents/skills/senior-qa/`](.agents/skills/senior-qa), [`.agents/skills/playwright-pro/`](.agents/skills/playwright-pro)
5. **Архитектура & качество** — [`.agents/skills/senior-architect/`](.agents/skills/senior-architect), [`.agents/skills/zero-hallucination-coder/`](.agents/skills/zero-hallucination-coder), [`.agents/skills/code-reviewer/`](.agents/skills/code-reviewer)
6. **DevOps & интеграции** — [`.agents/skills/docker-development/`](.agents/skills/docker-development), [`.agents/skills/ci-cd-pipeline-builder/`](.agents/skills/ci-cd-pipeline-builder), [`.agents/skills/jira-expert/`](.agents/skills/jira-expert), [`.agents/skills/handoff/`](.agents/skills/handoff), [`.agents/skills/self-improving-agent/`](.agents/skills/self-improving-agent)

Полная таблица маршрутизации и жизненный цикл story — в
[`.agents/rules/skills_usage.md`](.agents/rules/skills_usage.md).

## Детальные правила по категориям

| Тема | Файл |
|---|---|
| Использование скиллов и жизненный цикл задач | [`.agents/rules/skills_usage.md`](.agents/rules/skills_usage.md) |
| Безопасность и авторизация | [`.agents/rules/security.md`](.agents/rules/security.md) |
| Дизайн-система и UI-компоненты | [`.agents/rules/ui_design_code.md`](.agents/rules/ui_design_code.md) |
| Стандарты качества кода | [`.agents/rules/code_quality.md`](.agents/rules/code_quality.md) |

## Работа и документация

| Что нужно | Где |
|---|---|
| Текущие задачи и их статус | [`plans/README.md`](plans/README.md) |
| Создать новую задачу | [`plans/templates/story.md`](plans/templates/story.md) → `plans/active/` |
| Незапланированная работа | [`plans/BACKLOG.md`](plans/BACKLOG.md) |
| Текущие метрики качества | [`docs/quality/QUALITY_BASELINE.md`](docs/quality/QUALITY_BASELINE.md) |
| Вся остальная документация | [`docs/README.md`](docs/README.md) |
| Каталог скриптов и правила их использования | [`scripts/README.md`](scripts/README.md) |
