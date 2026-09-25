# Патч системы фильтрации реестра оборудования модуля EPS

Патч предназначен для существующей baremetal-установки в `/opt/ems-platform`.

## Изменения

- Реализована комплексная система фильтрации по всем 27 полям реестра оборудования;
- Добавлена боковая шторка детальной фильтрации `EquipmentFilterDrawer` (4 категории: Основные реквизиты, Классификаторы и износ, Эксплуатация и свойства, Временные интервалы);
- Добавлена строка инлайн-фильтров в шапку таблицы `EquipmentColumnFiltersRow` с дебаунсом ввода 300 мс;
- Добавлена плашка `EquipmentActiveFilterChips` для быстрого просмотра и точечного/полного сброса активных критериев;
- Обновлён бэкенд API `GET /api/eps/equipment` с эффективным построением условий Prisma по стандартным и JSON-полям;
- Поддержаны диапазоны дат (UTC), диапазоны чисел (износ, поверка) и тристейт-логика (критический путь, уникальное, импортное).

Изменений схемы PostgreSQL нет. Миграции и `prisma db push` не требуются.

## Применение

```bash
sha256sum -c ems-eps-registry-filter-patch.tar.gz.sha256
sudo rm -rf /opt/ems-eps-registry-filter-patch
sudo mkdir -p /opt/ems-eps-registry-filter-patch
sudo tar -xzf ems-eps-registry-filter-patch.tar.gz -C /opt/ems-eps-registry-filter-patch --strip-components=1
sudo env EMS_PATCH_APPROVED=1 \
  EMS_INSTALL_DIR=/opt/ems-platform \
  EMS_SERVICE_NAME=ems-platform \
  /opt/ems-eps-registry-filter-patch/scripts/baremetal-overlay-patch.sh
```

Скрипт не изменяет `.env`, `.env.production`, `uploads` или PostgreSQL. Перед заменой `.next` создаётся rollback-архив в `/var/backups/ems-platform/`.

## Проверка

```bash
sudo systemctl status ems-platform --no-pager
curl --fail http://127.0.0.1:3000/api/system/health
sudo journalctl -u ems-platform -n 100 --no-pager
```

## Rollback

```bash
sudo systemctl stop ems-platform
sudo rm -rf /opt/ems-platform/apps/web/.next
sudo tar -xzf /var/backups/ems-platform/app-before-patch-*.tar.gz -C /opt/ems-platform
sudo systemctl start ems-platform
```
