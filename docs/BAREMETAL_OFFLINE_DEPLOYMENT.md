# Руководство по автономному Baremetal-развертыванию EMS Platform (Без Docker, без Интернета)

Данное руководство описывает полный регламент переноса, установки и эксплуатации **EMS Platform** на виртуальной машине (или физическом сервере) в закрытом контуре **(Air-Gapped)** без доступа к сети Интернет и **без использования Docker** (чистый Baremetal стек на уровне операционной системы).

---

## 1. Архитектура автономного стека

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ИЗОЛИРОВАННАЯ ВМ (БЕЗ ИНТЕРНЕТА)                     │
│                                                                         │
│  [ Клиенты ЛВС ] ──► [ Nginx 80/443 ] (Опционально, Reverse Proxy)      │
│                              │                                          │
│                              ▼ :3000                                    │
│  [ Systemd Service ] ──► [ Node.js Runtime (EMS Platform Web App) ]     │
│                              │                                          │
│                              ▼ :5432                                    │
│                     [ PostgreSQL Database ]                             │
│                              │                                          │
│                     [ Локальное хранилище ]                             │
│                     /opt/ems-platform/uploads (Чертежи, фото, акты)     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Системные требования:
* **ОС:** Linux (Astra Linux, РЕД ОС, Ubuntu 20.04/22.04/24.04, Debian 11/12, Rocky/AlmaLinux/RHEL 8/9) или Windows Server 2016-2025.
* **CPU:** 2 ядра (рекомендуется 4+ ядра).
* **RAM:** 4 ГБ (рекомендуется 8+ ГБ).
* **Диск:** 30+ ГБ свободного пространства (SSD/NVMe).
* **Системные зависимости на целевой ВМ:**
  * **Node.js**: v18.17+, v20.x LTS или v22.x LTS.
  * **PostgreSQL**: v14, v15 или v16.
  * **Nginx** *(рекомендуется для отдачи статики и SSL)*.

---

## 2. Шаг 1. Сборка и упаковка на сборочной машине (с доступом к исходникам)

На рабочей машине разработчика или CI/CD сервере выполняется компиляция проекта, генерация клиента базы данных и сборка самодостаточного автономного архива со всеми зависимостями `node_modules`.

### Для Linux / macOS:
```bash
chmod +x scripts/baremetal-pack.sh
./scripts/baremetal-pack.sh
```

### Для Windows (PowerShell):
```powershell
.\scripts\baremetal-pack.ps1
```

**Результат выполнения:**
В корне проекта будет создан файл дистрибутива:
`ems-baremetal-bundle-YYYYMMDD_HHMMSS.tar.gz` (или `.zip`), содержащий:
* Скомпилированное Next.js приложение (`apps/web/.next`)
* Сгенерированный Prisma Client и схема БД
* Все готовые runtime-библиотеки в папке `node_modules`
* Скрипты автоматической установки и systemd-сервис
* Шаблоны конфигураций и документацию

---

## 3. Шаг 2. Подготовка целевой ВМ в закрытом контуре

Перед установкой EMS Platform убедитесь, что на изолированной ВМ установлены **Node.js** и **PostgreSQL**.

### 3.1. Установка Node.js в оффлайн-режиме (если не установлен)
Если в оффлайн-репозитории ОС нет Node.js, скачайте официальный архив Node.js бинарников на флешку (например, `node-v20.18.0-linux-x64.tar.xz`):
```bash
# Распаковка в системный каталог /usr/local
sudo tar -xJf node-v20.18.0-linux-x64.tar.xz -C /usr/local --strip-components=1

# Проверка
node -v # Должно вывести v20.x.x
```

### 3.2. Настройка базы данных PostgreSQL
1. Убедитесь, что служба PostgreSQL запущена:
   ```bash
   sudo systemctl enable --now postgresql
   ```
2. Создайте пользователя и базу данных для EMS Platform:
   ```bash
   sudo -u postgres psql
   ```
   В интерактивной консоли `psql` выполните команды:
   ```sql
   CREATE USER ems_user WITH PASSWORD 'Ваш_Сложный_Пароль_К_БД';
   CREATE DATABASE ems_db OWNER ems_user;
   GRANT ALL PRIVILEGES ON DATABASE ems_db TO ems_user;
   \q
   ```

---

## 4. Шаг 3. Перенос и установка EMS Platform на ВМ

1. Скопируйте архив `ems-baremetal-bundle-*.tar.gz` на целевую ВМ (через съемный носитель или локальную защищенную сеть).
2. Распакуйте архив:
   ```bash
   tar -xzf ems-baremetal-bundle-*.tar.gz
   cd ems-baremetal-bundle
   ```
3. Запустите автоматический установщик с правами root:
   ```bash
   sudo ./install.sh
   ```

### Что автоматически делает инсталлятор:
1. Создает системного пользователя `ems` с ограниченными правами.
2. Разворачивает приложение в каталог `/opt/ems-platform`.
3. Создает файл `.env.production` и генерирует криптостойкий ключ `JWT_SECRET`.
4. Создает каталог `/opt/ems-platform/uploads` для документации и чертежей.
5. Автономно синхронизирует структуру таблиц в PostgreSQL через встроенный локальный Prisma Engine.
6. Регистрирует и запускает системную службу `systemd` (`ems-platform.service`).
7. Проверяет отклик эндпоинта проверки работоспособности `http://127.0.0.1:3000/api/system/health`.

---

## 5. Шаг 4. Настройка Nginx Reverse Proxy (Рекомендуется)

Для доступа по стандартным портам 80 (HTTP) / 443 (HTTPS) и быстрой отдачи статических файлов настройте Nginx:

1. Скопируйте готовый шаблон конфигурации:
   ```bash
   sudo cp /opt/ems-platform/scripts/ems-baremetal.nginx.conf /etc/nginx/sites-available/ems
   ```
2. Активируйте сайт и перезапустите Nginx:
   ```bash
   # Для Ubuntu/Debian/Astra Linux:
   sudo ln -sf /etc/nginx/sites-available/ems /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx

   # Для RHEL/CentOS/РЕД ОС:
   sudo cp /opt/ems-platform/scripts/ems-baremetal.nginx.conf /etc/nginx/conf.d/ems.conf
   sudo nginx -t && sudo systemctl reload nginx
   ```

---

## 6. Шаг 5. Первый вход и первичная настройка

1. Откройте в браузере с рабочего места в локальной сети:
   * Если настроен Nginx: `http://<IP-адрес-ВМ>/`
   * Напрямую по порту Node.js: `http://<IP-адрес-ВМ>:3000/`
2. При первом запуске откроется **Мастер первичной настройки (Setup Wizard)**:
   * Задайте логин и пароль Главного администратора системы.
   * Настройте название предприятия и параметры филиалов/цехов.
   * При необходимости включите интеграцию с локальным корпоративным LDAP/AD или Service Desk.

---

## 7. Управление и эксплуатация службы

### Основные команды управления systemd:
```bash
# Проверить статус службы
sudo systemctl status ems-platform

# Перезапустить платформу
sudo systemctl restart ems-platform

# Остановить службу
sudo systemctl stop ems-platform

# Просмотр логов в реальном времени
sudo journalctl -u ems-platform -f

# Просмотр последних 100 строк лога
sudo journalctl -u ems-platform -n 100 --no-pager
```

### Резервное копирование базы данных и файлов

Для baremetal-установки используйте локальные PostgreSQL-утилиты. Скрипт
`scripts/backup.sh` исторически поддерживает Docker и может вывести предупреждение
`docker: command not found`, поэтому он не является основным способом backup для
baremetal VPS.

```bash
export APP_DIR="/opt/ems-platform"
export TS="$(date +%Y%m%d_%H%M%S)"
export BACKUP_DIR="/var/backups/ems-platform/$TS"

sudo mkdir -p "$BACKUP_DIR"
sudo -u postgres pg_dumpall | gzip | sudo tee "$BACKUP_DIR/database.sql.gz" >/dev/null
sudo tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$APP_DIR" uploads
sudo cp "$APP_DIR/.env.production" "$BACKUP_DIR/.env.production"
```

Проверьте, что backup базы не пустой:

```bash
sudo test -s "$BACKUP_DIR/database.sql.gz"
sudo ls -lh "$BACKUP_DIR"
```

---

## 8. Обновление действующей baremetal-установки

Для уже работающего VPS используется overlay-обновление. Не запускайте
`install.sh`: он предназначен для первоначальной установки.

### 8.1. Сборка релиза

На build-машине с исходниками:

```bash
chmod +x scripts/baremetal-pack.sh
./scripts/baremetal-pack.sh
sha256sum ems-baremetal-release.tar.gz
```

Архив не содержит `.env.production`, текущие `uploads/`, `Temp/` или backup-файлы.

### 8.2. Overlay на действующем VPS

Перенесите архив на VPS и проверьте checksum:

```bash
sha256sum /home/deps/ems-baremetal-release.tar.gz
```

Перед обновлением остановите только приложение и создайте backup базы, файлов и
конфигурации. PostgreSQL не останавливайте.

```bash
export APP_DIR="/opt/ems-platform"
export ARCHIVE="/home/deps/ems-baremetal-release.tar.gz"
export TS="$(date +%Y%m%d_%H%M%S)"
export BACKUP_DIR="/var/backups/ems-platform/$TS"
export RELEASE_DIR="/tmp/ems-release-$TS"
export OLD_DIR="/opt/ems-platform.previous-$TS"

sudo mkdir -p "$BACKUP_DIR"
sudo -u postgres pg_dumpall | gzip | sudo tee "$BACKUP_DIR/database.sql.gz" >/dev/null
sudo tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$APP_DIR" uploads
sudo cp "$APP_DIR/.env.production" "$BACKUP_DIR/.env.production"
sudo systemctl stop ems-platform

mkdir -p "$RELEASE_DIR"
tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"
sudo mv "$APP_DIR" "$OLD_DIR"
sudo mv "$RELEASE_DIR/ems-baremetal-release" "$APP_DIR"
sudo cp "$OLD_DIR/.env.production" "$APP_DIR/.env.production"
sudo cp -a "$OLD_DIR/uploads" "$APP_DIR/uploads"
sudo chown -R ems:ems "$APP_DIR"
sudo chmod 600 "$APP_DIR/.env.production"
```

### 8.3. Безопасная синхронизация схемы

Сначала проверьте Prisma без загрузки `.env.production` через shell. Это важно,
если значения окружения содержат специальные символы:

```bash
sudo -u ems sh -c '
  URL=$(sed -n "s/^DATABASE_URL=//p" /opt/ems-platform/.env.production | sed "s/^\"//; s/\"$//; s/\r$//")
  export DATABASE_URL="$URL"
  cd /opt/ems-platform
  ./packages/database/node_modules/.bin/prisma validate \
    --schema=packages/database/prisma/schema.prisma
'
```

После успешной валидации примените только безопасное обновление схемы:

```bash
sudo -u ems sh -c '
  URL=$(sed -n "s/^DATABASE_URL=//p" /opt/ems-platform/.env.production | sed "s/^\"//; s/\"$//; s/\r$//")
  export DATABASE_URL="$URL"
  cd /opt/ems-platform
  ./packages/database/node_modules/.bin/prisma db push \
    --schema=packages/database/prisma/schema.prisma \
    --skip-generate
'
```

Никогда не используйте на действующей базе:

```text
--accept-data-loss
```

Если Prisma сообщает о destructive changes или требует этот флаг, прекратите
обновление и восстановите старую версию приложения из `$OLD_DIR`.

### 8.4. Запуск и проверка

```bash
sudo systemctl daemon-reload
sudo systemctl start ems-platform
sudo systemctl status ems-platform --no-pager
curl --fail http://127.0.0.1:3000/api/system/health
sudo journalctl -u ems-platform -n 100 --no-pager
```

После успешной проверки убедитесь, что количество файлов не изменилось:

```bash
sudo find /opt/ems-platform/uploads -type f | wc -l
sudo systemctl status postgresql --no-pager
```

### 8.5. Импорт оборудования

Стратегия `FULL_REPLACE` отключена на сервере и удалена из интерфейса. Импорт
использует только безопасные стратегии `UPSERT` и `SKIP`.

Обычный импорт не публикует оборудование напрямую в `ACTIVE`: новые записи
создаются как `DRAFT`, а изменения и commissioning проходят через approval workflow.

### 8.6. Rollback кода

```bash
sudo systemctl stop ems-platform
sudo rm -rf /opt/ems-platform
sudo mv "$OLD_DIR" /opt/ems-platform
sudo chown -R ems:ems /opt/ems-platform
sudo chmod 600 /opt/ems-platform/.env.production
sudo systemctl start ems-platform
curl --fail http://127.0.0.1:3000/api/system/health
```

Обычный rollback кода не требует восстановления БД. Не выполняйте destructive
rollback schema без отдельного согласованного плана восстановления.
