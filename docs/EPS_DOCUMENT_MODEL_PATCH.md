# Патч отображения модели оборудования в документации

Патч предназначен для существующей baremetal-установки в `/opt/ems-platform`.

## Изменения

- модель показывается в выборе оборудования при загрузке документа;
- модель показывается в реестре документации;
- модель показывается на вкладке документов оборудования;
- поиск документов учитывает модель оборудования.

Изменений схемы PostgreSQL нет. Миграции и `prisma db push` не требуются.

## Применение

```bash
sha256sum -c ems-eps-document-model-patch.tar.gz.sha256
sudo rm -rf /opt/ems-eps-document-model-patch
sudo tar -xzf ems-eps-document-model-patch.tar.gz -C /opt
sudo env EMS_PATCH_APPROVED=1 \
  EMS_INSTALL_DIR=/opt/ems-platform \
  /opt/ems-eps-document-model-patch/scripts/baremetal-overlay-patch.sh
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
sudo tar -xzf /var/backups/ems-platform/app-before-eps-doc-model-*.tar.gz -C /opt/ems-platform
sudo systemctl start ems-platform
```
