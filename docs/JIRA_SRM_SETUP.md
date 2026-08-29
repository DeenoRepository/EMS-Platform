# Инструкция по развертыванию Jira в Docker и интеграции модуля SRM

Данный документ описывает развертывание сервиса Atlassian Jira в Docker, структуру реальных данных Service Desk из папки `temp/` и их интеграцию с модулем SRM (Service Request Management) платформы EMS.

---

## 1. Обзор архитектуры и данных

В папке `temp/` содержатся реальные выгрузки тикетов корпоративной Jira Service Management:
- **`КП ИМС - Сектор измерений.xml`** — **814 заявок** (проект `GRIO2`, "ГриО КПИМС (Сектор измерений)").
- **`КП ИМС - Сектор сборки.xml`** — **119 заявок** (проект `GRIO`, "ГРиО КПИМС (Сектор сборки)").
- **`НПК ПП - Сектор сборки и измерений.xml`** — **312 заявок** (проект `GRIO1`, "ГРиО НПКПП (Сектор сборки)").
- **Итого**: **1 245 реальных заявок** с историей инцидентов, исполнителями, SLA-таймингами (первый отклик, время решения), видами работ ("Ремонт", "Настройка", "ТО") и привязками к инвентарным номерам оборудования.

---

## 2. Варианты запуска Jira в Docker

### Вариант А: Автономный Jira REST API сервис (Рекомендуется для разработки и тестов)
Легковесный контейнер на базе Node.js, реализующий стандартный Jira REST API v2 (`/rest/api/2/search`, `/rest/api/2/myself`, `/rest/api/2/issue/:key`, `/rest/api/2/project`, `/rest/api/2/field`).
Автоматически считывает все XML-файлы из `temp/` и предоставляет полноценный REST API для модуля SRM без необходимости лицензий и высоких системных требований.

**Запуск через Docker Compose:**
```bash
# Запуск сервиса Jira в фоновом режиме
docker compose up -d jira

# Проверка логов
docker compose logs -f jira
```

Сервис доступен по адресу: **`http://localhost:8080`** (внутри Docker-сети: `http://ems_jira:8080` или `http://jira:8080`).

**Локальный запуск без Docker:**
```bash
pnpm jira:start
```

---

### Вариант Б: Официальный Atlassian Jira Software 9.10.0 (Enterprise)
Для промышленного развертывания официального сервера Jira с отдельной СУБД PostgreSQL подготовлен файл `docker-compose.jira-enterprise.yml`:

```bash
# Запуск официального Atlassian Jira Software Server с Postgres
docker compose -f docker-compose.jira-enterprise.yml up -d
```

---

## 3. Прямой импорт данных в базу EMS (`pnpm srm:import-jira`)

Для мгновенной загрузки и связывания всех 1 245 заявок с паспортами оборудования (EPS Equipment) в PostgreSQL EMS выполните:

```bash
pnpm srm:import-jira
```

### Что делает скрипт:
1. Создает системные записи `SrmIntegration` для проектов `GRIO`, `GRIO1`, `GRIO2`.
2. Загружает список оборудования из таблицы `Equipment`.
3. Извлекает инвентарные номера (по шаблону 5–7 цифр) и серийные номера из кастомных полей Jira (`customfield_10100`).
4. Автоматически сопоставляет заявку с единицей оборудования.
5. Сохраняет задачи в локальный кэш `JiraIssueCache`.

---

## 4. Конфигурация переменных окружения (`.env`)

В файле `.env` настройте параметры подключения к Jira:

```env
# Включение интеграции SRM с Jira
JIRA_ENABLED=true
JIRA_HOST=http://localhost:8080
JIRA_BASE_URL=http://localhost:8080
JIRA_EMAIL=admin@company.local
JIRA_USER_EMAIL=admin@company.local
JIRA_API_TOKEN=your-jira-api-token-or-password
JIRA_PROJECT_KEY=GRIO
JIRA_EQUIPMENT_CUSTOM_FIELD=customfield_10100
```

---

## 5. Доступные REST API эндпоинты Jira Mock

| Метод | URL | Описание |
|---|---|---|
| `GET` | `/rest/api/2/myself` | Проверка авторизации и профиль пользователя |
| `GET` | `/rest/api/2/serverInfo` | Информация о версии Jira (9.10.0 Server) |
| `GET` | `/rest/api/2/project` | Список проектов (`GRIO`, `GRIO1`, `GRIO2`) |
| `GET` | `/rest/api/2/field` | Схема полей (включая customfield оборудования и SLA) |
| `GET` / `POST` | `/rest/api/2/search` | Поиск задач с поддержкой JQL (`project = GRIO`, `status = ...`) и пагинации |
| `GET` | `/rest/api/2/issue/:key` | Получение карточки отдельной задачи |
| `POST` | `/rest/api/2/issue` | Создание новой сервисной заявки |
| `GET` | `/health` | Проверка работоспособности сервиса |
