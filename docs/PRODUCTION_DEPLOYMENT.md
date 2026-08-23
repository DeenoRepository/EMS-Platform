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

### Шаг 3. Запуск автоматического скрипта развертывания

**Для Linux / Unix серверов:**
```bash
chmod +x scripts/prod-deploy.sh
./scripts/prod-deploy.sh
```

**Для Windows Server (PowerShell):**
```powershell
.\scripts\prod-deploy.ps1
```

**Или прямой командой Docker Compose:**
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 4. Конфигурация Nginx & SSL/TLS (HTTPS)

Для работы по защищенному протоколу HTTPS:
1. Поместите SSL-сертификаты в каталог:
   * `docker/nginx/ssl/ems.crt`
   * `docker/nginx/ssl/ems.key`
2. Раскомментируйте секцию `listen 443 ssl` в файле [`docker/nginx/nginx.conf`](../docker/nginx/nginx.conf).
3. Перезапустите контейнер Nginx:
   ```bash
   docker compose -f docker-compose.prod.yml restart nginx
   ```

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

### Восстановление из бэкапа:
```bash
gunzip -c backups/ems_database_YYYYMMDD_HHMMSS.sql.gz | docker exec -i ems_postgres_prod psql -U postgres -d ems_db
```

---

## 6. Мониторинг и проверка работоспособности (Health Checks)

Система предоставляет стандартные эндпоинты мониторинга:
* **System Health:** `GET http://localhost:3000/api/system/health`
* **Setup Status & Pre-flight:** `GET http://localhost:3000/api/setup/status`
* **Nginx Health Probe:** `GET http://localhost/healthz`

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
