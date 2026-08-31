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

### Резервное копирование базы данных и файлов:
Для создания резервной копии запустите встроенный скрипт:
```bash
sudo /opt/ems-platform/scripts/backup.sh
```
Архивы базы данных и загруженных файлов будут сохранены в `/opt/ems-platform/backups/`.

---

## 8. Процесс обновления в оффлайн-режиме (Rolling Update)

При выпуске новой версии платформы:
1. Соберите новый архив `ems-baremetal-bundle-new.tar.gz` на сборочной машине (`./scripts/baremetal-pack.sh`).
2. Перенесите архив на целевую ВМ.
3. Остановите службу:
   ```bash
   sudo systemctl stop ems-platform
   ```
4. **Обязательно** создайте резервную копию текущей БД перед миграцией:
   ```bash
   sudo /opt/ems-platform/scripts/backup.sh
   ```
5. Распакуйте новые файлы поверх `/opt/ems-platform` (файл `.env.production` и папка `uploads/` сохраняются).
6. Примените версионированные миграции БД (`prisma migrate deploy`, не
   `db push --accept-data-loss`): миграции применяются по порядку из
   `packages/database/prisma/migrations/`, а не приводят схему к целевому
   виду без плана и истории.
   ```bash
   sudo su -s /bin/sh ems -c "cd /opt/ems-platform && export \$(grep -v '^#' .env.production | xargs) && ./packages/database/node_modules/.bin/prisma migrate deploy --schema=packages/database/prisma/schema.prisma"
   ```

   **Если это первое обновление после перехода на версионированные
   миграции** (база данных ранее создавалась через `db push`, история
   миграций отсутствует), команда выше завершится ошибкой Prisma `P3005`
   («The database schema is not empty») — это ожидаемо и **не является
   потерей данных**. Прежде чем повторить `migrate deploy`, пометьте базу
   как уже находящуюся на baseline-миграции (данные не изменяются):
   ```bash
   sudo su -s /bin/sh ems -c "cd /opt/ems-platform && export \$(grep -v '^#' .env.production | xargs) && ./packages/database/node_modules/.bin/prisma migrate resolve --applied 20260831030000_init --schema=packages/database/prisma/schema.prisma"
   ```
   После этого повторите `migrate deploy` из этого шага — команда должна
   сообщить «No pending migrations to apply» (или применить только
   миграции новее baseline).
7. Запустите службу:
   ```bash
   sudo systemctl start ems-platform
   ```
