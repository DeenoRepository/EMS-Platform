# Патч: Массовое редактирование и поиск одинаковых строк в реестре оборудования EPS

## 1. Назначение патча
Патч добавляет возможность массового редактирования позиций в реестре оборудования (`/eps`):
- Поиск повторяющихся одинаковых строк в выбранной колонке (с отображением количества совпадений `X шт.`);
- Пакетная замена на новое значение (режимы точного совпадения и совпадения подстроки);
- Синхронизация как прямых полей модели `Equipment`, так и кастомных полей `customFields` (подразделения, виды оборудования, критичность, МОЛ и др.);
- Разграничение прав доступа (RBAC): операция доступна строго при наличии специального разрешения `eps.equipment.batch_edit` (или роли администратора);
- Защита и безопасность: предварительный просмотр (preview), подтверждающий диалог `ConfirmDialog`, атомарное обновление через транзакцию Prisma `$transaction`, запись событий в системный аудит (`logAuditEvent`) и защита от перегрузки `enforceRateLimit`.

## 2. Установка патча на Baremetal VPS

Архив с патчем: `ems-eps-batch-edit-patch.tar.gz` (или `ems-eps-document-model-patch.tar.gz`).

### Шаги установки:
1. Скопируйте архив на целевой сервер:
   ```bash
   scp ems-eps-batch-edit-patch.tar.gz root@<vps_ip>:/tmp/
   ```
2. Подключитесь к VPS по SSH и распакуйте архив:
   ```bash
   cd /tmp
   tar -xzf ems-eps-batch-edit-patch.tar.gz
   cd ems-eps-batch-edit-patch
   ```
3. Примените патч с созданием автоматического бэкапа для отката:
   ```bash
   sudo env EMS_PATCH_APPROVED=1 ./scripts/baremetal-overlay-patch.sh
   ```
4. Скрипт автоматически:
   - Создаст резервную копию текущей сборки в `/var/backups/ems-platform/`;
   - Обновит скомпилированное приложение Next.js;
   - Применит идемпотентное добавление права `eps.equipment.batch_edit` в PostgreSQL;
   - Перезапустит службу `ems-platform` и выполнит проверку healthcheck.

## 3. Откат при необходимости
В случае необходимости отката восстановите предыдущую версию из архива `/var/backups/ems-platform/app-before-patch-*.tar.gz`:
```bash
sudo systemctl stop ems-platform
sudo tar -xzf /var/backups/ems-platform/app-before-patch-*.tar.gz -C /opt/ems-platform/
sudo chown -R ems:ems /opt/ems-platform/apps/web/.next
sudo systemctl start ems-platform
```
