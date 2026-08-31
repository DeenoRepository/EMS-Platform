# Руководство по развертыванию EMS Platform в Production

Данный документ содержит пошаговую инструкцию по развертыванию, мониторингу, резервному копированию и обслуживанию системы управления оборудованием **EMS Platform** в промышленной среде.

---

## 1. Системные требования

### Аппаратные ресурсы (минимальные / рекомендуемые):
* **CPU:** 2 ядра (рекомендуется 4+ ядра)
* **RAM:** 4 ГБ (рекомендуется 8+ ГБ)
* **Дисковое пространство:** 50 ГБ NVMe/SSD (в зависимости от объема чертежей и документации)
* **Сеть:** 100 Мбит/с+, доступ к СУБД, LDAP/Active Directory и внешнему Service Desk

### Программное окружение:
* **Docker Engine:** v24.0+
* **Docker Compose:** v2.20+
* **Node.js (для локального запуска без Docker):** v18.0.0+ (рекомендуется LTS 20 или 22)
* **СУБД:** PostgreSQL v14 / v15 / v16

---

## 2. Структура веток в Git (Branching Strategy)

В проекте используется стандартизированная модель версионирования и ветвления:

1. **`main` (Production):**
   * Основная стабильная ветка промышленного релиза.
   * Содержит только проверенные, протестированные и готовые к развертыванию версии.
   * Автоматический CI/CD запускает проверку сборки и тестов при каждом пуше/PR.

2. **`develop` (Development / Staging):**
   * Ветка активной разработки, интеграции нового функционала и предрелизного тестирования.
   * В неё вливаются функциональные ветки (`feat/*`, `fix/*`).

---

## 3. Быстрый запуск в Production (Docker Compose)

### Шаг 1. Клонирование репозитория
```bash
git clone https://github.com/DeenoRepository/EMS-Platform.git
cd EMS-Platform
git checkout main
```

### Шаг 2. Конфигурация переменных окружения
Скопируйте шаблон и настройте безопасные пароли:
```bash
cp .env.production.example .env.production
```

Отредактируйте `.env.production`:
* `POSTGRES_PASSWORD` — сложный криптостойкий пароль к базе данных.
* `JWT_SECRET` — случайный секретный ключ (минимум 32 символа, сгенерируйте через `openssl rand -base64 48`).
* `LDAP_*` — параметры доменной службы Active Directory / OpenLDAP (если используется).
* `SRM_*` — параметры внешней интеграции с Service Desk (Jira, Redmine, GitLab или Generic REST).

### Шаг 3. Запуск production-стека Docker Compose

В репозитории поддерживается прямой запуск production Compose-файла:

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
```

Перед запуском `config` должен завершиться успешно и показать, что реальные
production secrets подставлены из `.env.production` или внешнего secret store.
Не используйте [`docker-compose.yml`](../../docker-compose.yml) для production:
это локальный development stack, который запускается только с явными значениями
из `.env` и использует `NODE_ENV=development`. Для изолированной среды
используйте [`docker-compose.offline.yml`](../../docker-compose.offline.yml).

---

## 4. Конфигурация TLS/HTTPS

Production Compose публикует приложение через HTTP на внутреннем/доверенном
контуре. TLS termination должен выполняться утверждённым внешним ingress или
load balancer, который:

1. Использует сертификат для production hostname.
2. Перенаправляет HTTP на HTTPS.
3. Передаёт `X-Forwarded-Proto: https` и исходный client IP.
4. Добавляет HSTS только после фактического включения HTTPS.

Текущий [`docker/nginx/nginx.conf`](../../docker/nginx/nginx.conf) намеренно не
слушает 443 и не содержит сертификатов. Не публикуйте порт 443 этого Compose
стека до отдельной проверки TLS-конфигурации. Для TLS smoke используйте
внешний hostname и проверку `curl -I https://<production-host>/healthz`.

---

## 5. Резервное копирование и восстановление (Backup & Restore)

### Создание резервной копии базы данных и файлов:
* **Linux / Bash:**
  ```bash
  chmod +x scripts/backup.sh
  ./scripts/backup.sh
  ```
  *(Резервные копии БД и файлов архивируются в `backups/` и хранятся 30 дней)*

* **Windows / PowerShell:**
  ```powershell
  .\scripts\backup.ps1
  ```

[`backup.sh`](../../scripts/backup.sh) и [`backup.ps1`](../../scripts/backup.ps1)
завершаются **ненулевым кодом возврата**, если снять дамп БД не удалось
(например, контейнер PostgreSQL не запущен), и в этом случае **не выполняют**
ретенцию — старые рабочие копии не удаляются из-за временного сбоя.
Каталог `backups/` создаётся с правами `700` (доступ только владельцу):
он содержит полный дамп всех данных системы и не должен раздаваться Nginx
или быть читаемым другими системными пользователями. Ни один из
[`nginx.conf`](../../docker/nginx/nginx.conf) не проксирует `backups/` —
директория недоступна извне контейнера `ems-web`.

### Автоматизация по расписанию (Docker Compose):

Скрипт бэкапа выполняется на **хосте**, а не внутри контейнера — он сам
находит запущенный контейнер `ems_postgres_prod` через `docker exec`.
Поэтому расписание настраивается штатным планировщиком хост-ОС:

```bash
# crontab -e (от пользователя, у которого есть доступ к docker и к каталогу проекта)
0 3 * * * cd /path/to/EMS-Platform && ./scripts/backup.sh >> /var/log/ems-backup.log 2>&1
```

Для baremetal-развёртывания (без Docker) используется systemd-таймер —
см. [`BAREMETAL_OFFLINE_DEPLOYMENT.md`](BAREMETAL_OFFLINE_DEPLOYMENT.md#7-1-автоматизация-резервного-копирования-systemd-timer).

### Восстановление из бэкапа:

**Предупреждение:** `pg_dumpall -c` (используемый в `backup.sh`) включает
`DROP DATABASE`/`DROP ROLE` для каждого объекта перед его пересозданием.
Восстановление этого дампа в **не ту** среду безвозвратно удалит
существующие в ней базы данных с теми же именами. Восстанавливайте только
в предназначенную для этого систему.

```bash
# Дамп pg_dumpall -c содержит собственные CREATE DATABASE/DROP DATABASE —
# подключаться нужно к системной базе postgres, а не к целевой ems_db.
gunzip -c backups/ems_database_YYYYMMDD_HHMMSS.sql.gz | docker exec -i ems_postgres_prod psql -U postgres -d postgres
```

Процедура восстановления проверена практически (не только описана): дамп,
снятый скриптом `backup.sh` с реальной локальной базы PostgreSQL, был
воспроизведён через `gunzip | psql -d postgres` в кластер после удаления
исходной базы данных — восстановленная база и её строки данных совпали с
исходными.

---

## 5.1. Миграции базы данных при обновлении версии

Контейнер `ems-web` применяет версионированные миграции Prisma
(`prisma migrate deploy` из
[`packages/database/prisma/migrations/`](../../packages/database/prisma/migrations/))
автоматически при каждом старте — см. `CMD` в [`Dockerfile`](../../Dockerfile).
Это применяет только новые миграции по порядку и не приводит схему к
целевому виду вслепую, в отличие от `db push --accept-data-loss`.

**Перед обновлением на новую версию на действующей БД — обязательно
создайте резервную копию** (раздел 5 выше). `migrate deploy` не имеет
команды отката: единственный путь назад — восстановление из бэкапа.

**Если это первое обновление после перехода на версионированные миграции**
(БД ранее создавалась через `db push`), при старте контейнера в логах
появится ошибка Prisma `P3005` («The database schema is not empty») — это
означает, что база данных не потеряна, а просто ещё не размечена как
находящаяся на baseline-миграции.

Контейнер при этом **намеренно не поднимется**: приложение не запускается
поверх непромигрированной схемы, иначе healthcheck был бы зелёным при
расхождении схемы и кода. Посмотреть причину:
```bash
docker compose -f docker-compose.prod.yml logs --tail=50 ems-web
```

Разметьте БД как находящуюся на baseline (данные не изменяются) и запустите
сервис заново. Так как контейнер остановлен, `exec` в него невозможен —
используйте одноразовый контейнер `run --rm`:
```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint sh ems-web -c \
  "pnpm --filter @ems/database exec prisma migrate resolve --applied 20260831030000_init"
docker compose -f docker-compose.prod.yml up -d ems-web
```
После этого `migrate deploy` при последующих запусках будет находить
только миграции новее baseline, и контейнер стартует штатно.

---

## 6. Мониторинг, SLO и проверка работоспособности

Система предоставляет стандартные эндпоинты мониторинга:
* **System Health:** `GET http://localhost:3000/api/system/health`
* **Setup Status & Pre-flight:** `GET http://localhost:3000/api/setup/status`
* **Nginx Health Probe:** `GET http://localhost/healthz`

До подключения пользователей владелец production-среды должен утвердить и
подключить измерение следующих начальных целей (или заменить их утверждёнными
организационными значениями):

* API CRUD latency: p50 ≤ 200 ms, p95 ≤ 800 ms, p99 ≤ 1500 ms.
* Mobile 4G frontend: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
* Availability SLO: не менее 99.5% в календарный месяц, с отдельно объявленными
  окнами технического обслуживания.

Readiness считается успешным только при HTTP 200 и `isReady: true`. HTTP 503,
ошибки миграций и failed backup должны направляться в alerting эксплуатации.
Минимальный operational monitoring обязан проверять `/healthz` и
`/api/system/health` с интервалом не более 60 секунд, хранить результаты и
создавать alert после трёх последовательных неуспешных проверок.

Приложение пишет структурированные события в stdout/stderr контейнера или
systemd journal. Сборщик логов production должен сохранять как минимум timestamp,
уровень, сообщение, request/correlation identifier (если передан), HTTP status и
контекст ошибки без JWT, паролей, API-ключей и содержимого загруженных файлов.
На текущем этапе проект не заявляет встроенный Prometheus exporter, tracing или
внешний error tracker: такие интеграции должны подключаться на уровне
production-платформы и проверяться отдельным release criterion.

---

## 7. Полезные команды управления

```bash
# Просмотр статуса контейнеров
docker compose -f docker-compose.prod.yml ps

# Просмотр логов приложения в реальном времени
docker compose -f docker-compose.prod.yml logs -f ems-web

# Остановка промышленного стека
docker compose -f docker-compose.prod.yml down

# Перезапуск стека с обновлением образов
docker compose -f docker-compose.prod.yml up -d --build
```
