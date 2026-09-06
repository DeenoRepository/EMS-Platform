# Регламент обновления и отката действующей установки (Deployment & Rollback Runbook)

**Версия:** 2.0 (Schema-Neutral Modular Release)  
**Область действия:** Обновление эксплуатируемого экземпляра EMS Platform с выводом прототипов SRM/MRO и разделением доменов EPS и WMS.

---

## 1. Базовые принципы безопасности обновления

1. **Schema-Neutral Release (Нулевые изменения схемы БД):**
   - Настоящий релиз **НЕ выполняет DDL-миграций** (`ALTER TABLE`, `DROP TABLE`, `CREATE TABLE`).
   - Таблицы `maintenance_plans`, `maintenance_schedules`, `srm_issues`, `srm_integrations` и их связи сохраняются в БД.
   - Команды `prisma db push --accept-data-loss` и `prisma migrate reset` **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ** на действующей базе данных.
2. **Разделение Fresh Install и Upgrade:**
   - Инсталлятор `scripts/baremetal-install.sh` и контейнерный запуск `Dockerfile` разделены на режимы:
     - При первичной установке применяется начальная схема.
     - При обновлении существующей инсталляции выполняется только генерация типизированного клиента (`prisma generate`), без деструктивных вызовов `db push`.
3. **Сохранность данных и истории:**
   - Все ранее проведенные списания ЗИП, созданные MRO, сохраняются без отката.
   - Исторические обращения SRM и регламенты ТО доступны для чтения в паспортах оборудования EPS.

---

## 2. Предварительные шаги (Pre-Deployment Checklist)

1. **Создание согласованного бэкапа:**
   - Снять полный дамп базы данных PostgreSQL:
     ```bash
     bash scripts/backup.sh
     # Либо через PowerShell:
     .\scripts\backup.ps1
     ```
   - Заархивировать каталог пользовательских файлов `/app/uploads` (чертежи, паспорта, фото оборудования).
2. **Фиксация контрольных сумм и контрольных показателей БД (Pre-Upgrade Baseline):**
   - Выполнить контрольный запрос до обновления и зафиксировать в протоколе:
     ```sql
     SELECT count(*) AS total_equipment FROM "Equipment";
     SELECT count(*) AS total_stock FROM "StockItem";
     SELECT sum(quantity) AS total_qty FROM "StockItem";
     SELECT count(*) AS total_operations FROM "StockOperation";
     SELECT count(*) AS total_users FROM "User";
     SELECT count(*) AS total_mro_schedules FROM "MaintenanceSchedule";
     SELECT count(*) AS total_srm_issues FROM "SrmIssue";
     ```
3. **Подготовка артефактов отката:**
   - Зафиксировать Docker-образ или исходный коммит предыдущей стабильной версии (`b9d22cf` или тег действующего прода).

---

## 3. Процедура развертывания обновления (Upgrade Procedure)

### Сценарий A: Docker Compose Deployment

1. Остановить фоновые внешние задачи (если были настроены cron-синхронизации):
2. Загрузить обновленный код ветки `feat/modularize-eps-wms-retire-srm-mro`:
   ```bash
   git fetch origin
   git checkout feat/modularize-eps-wms-retire-srm-mro
   ```
3. Пересобрать и перезапустить контейнеры:
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. Убедиться, что контейнер успешно запущен:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs --tail=100 ems-web
   ```

### Сценарий B: Bare-metal / Offline Installation

1. Запустить обновленный скрипт обновления:
   ```bash
   sudo bash scripts/baremetal-install.sh
   ```
   Скрипт автоматически распознает флаг `.installed`, выполнит безопасную генерацию `prisma generate` без `db push` и перезапустит `systemd`-службу `ems-platform`.

---

## 4. Верификация после обновления (Smoke & Health Checks)

1. **Проверка эндпоинта здоровья:**
   ```bash
   curl -I http://localhost:3000/api/system/health
   # Ожидаемый ответ: HTTP/1.1 200 OK
   ```
2. **Проверка авторизации и RBAC:**
   - Войти под учетной записью инженера и администратора.
   - Убедиться, что роли и существующие назначения прав загружены корректно.
3. **Проверка модуля EPS:**
   - Открыть `/eps` (реестр оборудования загружается без ошибок).
   - Открыть карточку станка `/eps/[id]` — проверить наличие вкладок «Архив ТО» и «Архив инцидентов», отображающих исторические данные.
   - Проверить открытие документов и фотографий оборудования.
4. **Проверка модуля WMS:**
   - Открыть `/wms/stock` — проверить остатки ТМЦ.
   - Открыть `/wms/operations` — создать тестовый приход ТМЦ (убедиться, что остаток увеличился, запись в журнал добавилась).
5. **Проверка декоммиссионированных модулей SRM/MRO:**
   - Запрос к `POST /api/srm/webhooks/test-id` возвращает `200 OK` с сообщением `retired` (без циклических ретраев).
   - Переход по `/srm` и `/mro` открывает информационную страницу о выводе прототипов из эксплуатации без сбоев системы.

---

## 5. Процедура экстренного отката (Rollback Runbook)

В случае выявления непредвиденных блокирующих дефектов в течение гарантийного окна:

1. **Остановка сервиса новой версии:**
   ```bash
   docker compose -f docker-compose.prod.yml down
   # Либо bare-metal:
   sudo systemctl stop ems-platform
   ```
2. **Откат кода / переключение на прежний образ:**
   ```bash
   git checkout b9d22cf
   docker compose -f docker-compose.prod.yml up -d
   # Либо bare-metal:
   pnpm --filter @ems/web start
   sudo systemctl start ems-platform
   ```
3. **Совместимость данных при отказе отката БД:**
   - Поскольку физическая схема базы данных в обновлении **не менялась**, восстановление базы из дампа требуется **только** в случае повреждения данных новыми операциями.
   - Если данные не повреждены, старый образ приложения бесшовно стартует поверх текущей БД.
4. **Восстановление БД из бэкапа (при повреждении данных):**
   ```bash
   gunzip -c /path/to/backup/ems_backup_YYYYMMDD.sql.gz | psql -U ems_user -d ems_db
   ```
5. **Повторный аудит и закрытие инцидента.**
