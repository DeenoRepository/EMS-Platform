# Overlay patch для существующей baremetal установки

Этот сценарий предназначен для уже работающей установки EMS. Он не создаёт новую конфигурацию и не перезаписывает существующие `.env`, `.env.production`, `uploads` или backup-файлы.

## Что делает

1. Требует root и `WMS_PATCH_APPROVED=1`.
2. Читает текущий `DATABASE_URL` из `/opt/ems-platform/.env.production`.
3. Создаёт custom-format PostgreSQL backup в `/var/backups/ems-platform/`.
4. Создаёт rollback-архив текущих application files.
5. Останавливает `ems-platform.service`.
6. Накладывает код из распакованного bundle поверх `/opt/ems-platform`.
7. Сохраняет существующие `.env*` и `uploads`.
8. Применяет additive WMS migration через approval gates.
9. Запускает сервис и проверяет `/api/system/health`.

## Подготовка

Распаковать bundle во временный каталог, например `/opt/ems-wms-patch`.

Проверить текущую установку:

```bash
sudo systemctl status ems-platform
sudo test -f /opt/ems-platform/.env.production
sudo test -d /opt/ems-platform/uploads
```

Проверить checksum bundle до запуска patch:

```bash
sha256sum ems-baremetal-release.tar.gz
```

## Запуск overlay patch

Если production migration уже согласована:

```bash
sudo env \
  WMS_PATCH_APPROVED=1 \
  WMS_BASELINE_VERIFIED=1 \
  WMS_ALLOW_PRODUCTION_TARGET=1 \
  EMS_INSTALL_DIR=/opt/ems-platform \
  /opt/ems-wms-patch/ems-baremetal-release/scripts/baremetal-overlay-patch.sh
```

Для code-only overlay без migration:

```bash
sudo env \
  WMS_PATCH_APPROVED=1 \
  WMS_PATCH_APPLY_MIGRATION=0 \
  EMS_INSTALL_DIR=/opt/ems-platform \
  /opt/ems-wms-patch/ems-baremetal-release/scripts/baremetal-overlay-patch.sh
```

Code-only режим нельзя использовать для текущей версии WMS, если приложение обращается к новым Prisma-полям. Для этого release сначала нужна migration.

## После patch

```bash
sudo systemctl status ems-platform --no-pager
curl --fail http://127.0.0.1:3000/api/system/health
sudo journalctl -u ems-platform -n 100 --no-pager
```

Проверить наличие backup и rollback archive:

```bash
sudo ls -lh /var/backups/ems-platform/
```

## Rollback application files

Migration additive и автоматически не откатывается. При проблеме приложения:

1. Остановить сервис.
2. Распаковать `app-before-wms-patch-*.tar.gz` в `/opt/ems-platform`.
3. Не удалять новые DB columns/tables без отдельной проверенной rollback migration.
4. Запустить сервис и проверить health.

## Запреты

- Не выполнять `prisma db push`.
- Не запускать patch без backup.
- Не удалять `.env.production`.
- Не удалять `uploads`.
- Не запускать patch параллельно с другим deploy.
- Не включать backfill legacy `TRANSFER`/`ADJUSTMENT` автоматически.
