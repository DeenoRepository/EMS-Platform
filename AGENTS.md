# Руководство для AI-агентов в проекте EMS-Platform

В данном проекте настроены специализированные скиллы и правила для разработки корпоративной системы управления оборудованием.

## 🚨 Обязательное правило фиксации изменений (Git Commit)
* **После каждой успешно выполненной задачи или логического этапа агент ОБЯЗАН выполнять Git-коммит.**
* Сообщение коммита должно следовать стандарту Conventional Commits на русском или английском языке:
  * `feat: ...` — новый функционал / компонент / модуль
  * `fix: ...` — исправление бага / ошибки
  * `refactor: ...` — оптимизация / рефакторинг без изменения функционала
  * `docs: ...` — документация / спецификации
  * `test: ...` — добавление или правка тестов
  * `chore: ...` — настройка конфигураций, зависимостей, скиллов

## Расположение скиллов
Все скиллы установлены в директорию [`.agents/skills/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills) и содержат структурированные инструкции (`SKILL.md`), справочные материалы (`references/`) и инструменты автоматизации (`scripts/`).

## Правила выбора скиллов под задачу
Перед выполнением профильных задач агент должен загружать и использовать соответствующие скиллы:

1. **Frontend & UI (Next.js 14, React 18, MUI v5)**:
   * [`.agents/skills/senior-frontend/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/senior-frontend)
   * [`.agents/skills/a11y-audit/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/a11y-audit)
2. **Backend & Database (Next API, Prisma, PostgreSQL)**:
   * [`.agents/skills/senior-backend/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/senior-backend)
   * [`.agents/skills/strict-api/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/strict-api)
   * [`.agents/skills/database-schema-designer/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/database-schema-designer)
3. **Безопасность & Авторизация (LDAP, JWT, RBAC)**:
   * [`.agents/skills/senior-security/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/senior-security)
   * [`.agents/skills/senior-secops/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/senior-secops)
4. **Тестирование (Jest, RTL, Playwright E2E)**:
   * [`.agents/skills/senior-qa/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/senior-qa)
   * [`.agents/skills/playwright-pro/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/playwright-pro)
5. **Архитектура & Качество кода**:
   * [`.agents/skills/senior-architect/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/senior-architect)
   * [`.agents/skills/zero-hallucination-coder/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/zero-hallucination-coder)
   * [`.agents/skills/code-reviewer/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/code-reviewer)
6. **DevOps & Интеграции (Docker, CI/CD, Jira SRM)**:
   * [`.agents/skills/docker-development/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/docker-development)
   * [`.agents/skills/ci-cd-pipeline-builder/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/ci-cd-pipeline-builder)
   * [`.agents/skills/jira-expert/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/jira-expert)
   * [`.agents/skills/handoff/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/handoff)
   * [`.agents/skills/self-improving-agent/`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/skills/self-improving-agent)

Подробные правила описаны в [`.agents/rules/skills_usage.md`](file:///home/deeno/Public/Projects/EMS-Platform/.agents/rules/skills_usage.md).
