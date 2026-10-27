# Руководство для AI-агентов в проекте EMS-Platform

В данном проекте настроены специализированные скиллы и правила для разработки корпоративной системы управления оборудованием.

> **Версия правил:** 2.0 (обновлено по результатам аудита 2026-08-27)  
> **Аудит-отчёт:** [`docs/CODE_REVIEW_AUDIT.md`](docs/CODE_REVIEW_AUDIT.md)

---

## 🚨 Обязательные правила разработки

### 1. Фиксация изменений (Git Commit)
* **После каждой успешно выполненной задачи или логического этапа агент ОБЯЗАН выполнять Git-коммит.**
* Сообщение коммита должно следовать стандарту Conventional Commits на русском или английском языке:
  * `feat: ...` — новый функционал / компонент / модуль
  * `fix: ...` — исправление бага / ошибки
  * `refactor: ...` — оптимизация / рефакторинг без изменения функционала
  * `docs: ...` — документация / спецификации
  * `test: ...` — добавление или правка тестов
  * `chore: ...` — настройка конфигураций, зависимостей, скиллов

### 2. Единый дизайн-код и использование Shared UI контролов (Запрет хардкода UI)
* **Все виджеты, контролы, панели инструментов и типовые элементы интерфейса ОБЯЗАНЫ использоваться из единой библиотеки общих компонентов (`@/components/ui`):**
  * Метрики и KPI карточки → `StatCard` (с микро-анимацией, трендами, индикатором загрузки и кликом для быстрой фильтрации)
  * Статусы оборудования, ТМЦ, согласований и задач → `StatusBadge` (с единой палитрой и семантическими иконками)
  * Поле живого поиска → `SearchInput` (со встроенным дебаунсом 300мс и очисткой)
  * Панель фильтров → `FilterToolbar` (с адаптивной компоновкой, счетчиком активных фильтров и кнопкой сброса)
  * Нулевые состояния (нет данных) → `EmptyState` (с иконкой, пояснением и кнопкой действия)
  * Таблицы и реестры данных → `DataTableWrapper` (с `stickyHeader`, компактной сеткой, полосой загрузки и пагинацией)
  * Модальные окна подтверждения → `ConfirmDialog` (для критических и необратимых действий)

* **ХАРДКОД UI КАТЕГОРИЧЕСКИ ЗАПРЕЩЕН**:
  * ❌ Запрещено создавать разрозненные локальные стили бейджей статусов, самописные плашки KPI, дублирующие инпуты поиска и нестандартизированные таблицы.
  * ❌ Запрещено использовать hex-цвета (`#0284c7`, `#94a3b8` и т.д.) в `sx={}` пропах компонентов MUI. Использовать только `theme.palette.*` или семантические токены (`primary.main`, `text.secondary`, `grey.50`).
  * ❌ Запрещено использовать `<Chip>` для отображения статусов сущностей — только `<StatusBadge>`.
  * ✅ Любой новый типовой UI-элемент должен оформляться как переиспользуемый компонент в `apps/web/src/components/ui/` и применяться сквозным образом во всех модулях платформы (EPS, WMS, SRM, MRO, Admin).

### 3. Безопасность — Обязательные требования (по результатам аудита)

* **Авторизация webhook-эндпоинтов**: если `webhookSecret` настроен, запрос БЕЗ токена должен быть ОТКЛОНЁН (401). Шаблон:
  ```typescript
  // ✅ ПРАВИЛЬНО — отклонить при отсутствии ИЛИ несовпадении
  if (!providedToken || providedToken !== webhookSecret) { return 401; }
  // ❌ НЕПРАВИЛЬНО — пропускает запросы без токена
  if (providedToken && providedToken !== webhookSecret) { return 401; }
  ```
* **Rate Limiting**: обязателен на всех чувствительных эндпоинтах (`/api/auth/*`, `/api/setup/*`, `/api/*/import/*`, `/api/*/reports/*`). Использовать `enforceRateLimit()` из `@/lib/rate-limit`.
* **RBAC**: каждый API-роут обязан проверять разрешение через `requireAuth(req, PERMISSIONS.*)` или `hasPermission(user, PERMISSIONS.*)`. Голых `getCurrentUser()` без проверки ролей недостаточно.
* **Нет raw SQL**: запросы только через Prisma типизированный ORM. `$queryRaw` допустим только с шаблонными литералами для простых health-check запросов.
* **LDAP**: всегда использовать `escapeLdapFilter()` перед подстановкой пользовательского ввода в LDAP-фильтр.

### 4. Качество кода — Обязательные пороги

| Метрика | Порог | Действие при нарушении |
|---|---|---|
| Длина функции | > 50 строк | Обязательная декомпозиция |
| Цикломатическая сложность | > 10 | Обязательный рефакторинг |
| Размер файла | > 500 строк | Разбить на модули |
| Параметры функции | > 5 | Передать объект-конфиг |
| Вложенность | > 4 уровня | Рефакторинг / early return |

* Файлы с оценкой **F (0-49/100)** по `code_quality_checker.py` подлежат обязательному рефакторингу перед слиянием в main.

### 5. Поставка кумулятивных патчей на продакшн-станцию (Production Patch Delivery)
* **При подготовке любых изменений для развертывания на работающий продакшн-сервер агент ОБЯЗАН собрать кумулятивный архив патча и предоставить финальный ответ СТРОГО в каноническом формате.**
* **Недопустимость потери данных (Zero Data Loss)**:
  * Патч накладывается поверх работающей системы через `scripts/baremetal-overlay-patch.sh`.
  * База данных PostgreSQL, пользовательские файлы/чертежи (`uploads/`), переменные окружения (`.env.production`), сертификаты и конфигурации Nginx **сохраняются в полном объеме**.
  * Скрипт автоматически создает резервную копию предыдущего билда в `/var/backups/ems-platform/app-before-patch-<timestamp>.tar.gz` перед заменой файлов.
* **Сборка архива и SHA-256**:
  * Выполняется через `./scripts/baremetal-patch-pack.sh ems-eps-document-model-patch`.
  * Архив автоматически копируется в `/mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz`, а его контрольная сумма вычисляется в `/mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz.sha256`.
* **Обязательный формат финального ответа агента (выводится строго по шаблону)**:
```text
Финальный кумулятивный архив патча:
Файл: /mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz
Контрольная сумма SHA-256:
<актуальный_sha256_архива>
Инструкция по обновлению на рабочей станции:
Скопировать архив и проверить контрольную сумму:
cp /mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz /home/deps/
cd /home/deps
sha256sum ems-eps-document-model-patch.tar.gz
Ожидается:

<актуальный_sha256_архива>  ems-eps-document-model-patch.tar.gz
Распаковать:
sudo rm -rf /opt/ems-eps-document-model-patch
sudo mkdir -p /opt/ems-eps-document-model-patch

sudo tar -xzf /home/deps/ems-eps-document-model-patch.tar.gz \
  -C /opt/ems-eps-document-model-patch \
  --strip-components=1
Применить патч:
sudo env \
  EMS_PATCH_APPROVED=1 \
  EMS_INSTALL_DIR=/opt/ems-platform \
  EMS_SERVICE_NAME=ems-platform \
  /opt/ems-eps-document-model-patch/scripts/baremetal-overlay-patch.sh
Проверить статус:
sudo systemctl status ems-platform --no-pager
curl --fail http://127.0.0.1:3000/api/system/health
Обновить страницу браузера: Ctrl + Shift + R. Будет накатываться на продакшн сервер. Данные не должны быть потеряны
```
* Подробный регламент: [`.agents/rules/production_patch.md`](.agents/rules/production_patch.md).

---

## Расположение скиллов
Все скиллы установлены в директорию [`.agents/skills/`](.agents/skills) и содержат структурированные инструкции (`SKILL.md`), справочные материалы (`references/`) и инструменты автоматизации (`scripts/`).

## Правила выбора скиллов под задачу
Перед выполнением профильных задач агент должен загружать и использовать соответствующие скиллы:

1. **Frontend & UI (Next.js 14, React 18, MUI v5)**:
   * [`.agents/skills/senior-frontend/`](.agents/skills/senior-frontend)
   * [`.agents/skills/a11y-audit/`](.agents/skills/a11y-audit)
2. **Backend & Database (Next API, Prisma, PostgreSQL)**:
   * [`.agents/skills/senior-backend/`](.agents/skills/senior-backend)
   * [`.agents/skills/strict-api/`](.agents/skills/strict-api)
   * [`.agents/skills/database-schema-designer/`](.agents/skills/database-schema-designer)
3. **Безопасность & Авторизация (LDAP, JWT, RBAC)**:
   * [`.agents/skills/senior-security/`](.agents/skills/senior-security)
   * [`.agents/skills/senior-secops/`](.agents/skills/senior-secops)
4. **Тестирование (Jest, RTL, Playwright E2E)**:
   * [`.agents/skills/senior-qa/`](.agents/skills/senior-qa)
   * [`.agents/skills/playwright-pro/`](.agents/skills/playwright-pro)
5. **Архитектура & Качество кода**:
   * [`.agents/skills/senior-architect/`](.agents/skills/senior-architect)
   * [`.agents/skills/zero-hallucination-coder/`](.agents/skills/zero-hallucination-coder)
   * [`.agents/skills/code-reviewer/`](.agents/skills/code-reviewer)
6. **DevOps & Интеграции (Docker, CI/CD, Jira SRM)**:
   * [`.agents/skills/docker-development/`](.agents/skills/docker-development)
   * [`.agents/skills/ci-cd-pipeline-builder/`](.agents/skills/ci-cd-pipeline-builder)
   * [`.agents/skills/jira-expert/`](.agents/skills/jira-expert)
   * [`.agents/skills/handoff/`](.agents/skills/handoff)
   * [`.agents/skills/self-improving-agent/`](.agents/skills/self-improving-agent)

Подробные правила описаны в [`.agents/rules/skills_usage.md`](.agents/rules/skills_usage.md).

## Детальные правила по категориям

| Тема | Файл |
|---|---|
| Использование скиллов и процесс разработки | [`.agents/rules/skills_usage.md`](.agents/rules/skills_usage.md) |
| Безопасность и авторизация | [`.agents/rules/security.md`](.agents/rules/security.md) |
| Дизайн-система и UI-компоненты | [`.agents/rules/ui_design_code.md`](.agents/rules/ui_design_code.md) |
| Стандарты качества кода | [`.agents/rules/code_quality.md`](.agents/rules/code_quality.md) |
| Поставка патчей на продакшн | [`.agents/rules/production_patch.md`](.agents/rules/production_patch.md) |
