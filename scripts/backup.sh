#!/bin/bash
# ==============================================================================
# EMS Platform — Production Backup Utility (Database + Storage)
# ==============================================================================
# Performs:
#   1. PostgreSQL Database Dump (via Docker container or pg_dump)
#   2. Local file storage archive (uploads/)
#   3. Auto-retention policy (deletes backups older than 30 days)
#
# Exit codes:
#   0 — database dump succeeded (storage archive is best-effort)
#   1 — database dump could not be created; nothing is deleted by retention
#
# A scheduler (cron/systemd timer) MUST treat a non-zero exit code as a failed
# backup. See scripts/ems-backup.service / ems-backup.timer for the systemd
# integration and docs/operations/PRODUCTION_DEPLOYMENT.md §5 for the
# verified restore procedure.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="${BACKUP_DIR}/ems_database_${TIMESTAMP}.sql.gz"
STORAGE_BACKUP_FILE="${BACKUP_DIR}/ems_storage_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"
# Backups contain a full database dump (all tables, all users' data) and are
# not meant to be served or readable by anyone but the backup operator.
# Restrict access regardless of the process umask.
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

echo "======================================================================"
echo "💾 EMS Platform — Запуск создания резервной копии ($TIMESTAMP)"
echo "======================================================================"

# 1. PostgreSQL Database Backup
# `set -o pipefail` (via `set -euo pipefail` above) makes the exit code of the
# `pg_dumpall | gzip` pipeline reflect a pg_dumpall failure, not gzip's
# success — otherwise a broken dump would still produce a "successful" file.
echo "📦 [1/2] Создание дампа базы данных PostgreSQL..."
CONTAINER_NAME="ems_postgres_prod"
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "$CONTAINER_NAME"; then
    CONTAINER_NAME="ems_postgres"
fi

DB_BACKUP_OK=false
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "$CONTAINER_NAME"; then
    if docker exec -t "$CONTAINER_NAME" pg_dumpall -c -U postgres | gzip > "$DB_BACKUP_FILE"; then
        DB_BACKUP_OK=true
    fi
elif command -v pg_dumpall &> /dev/null; then
    if pg_dumpall -U postgres -h localhost | gzip > "$DB_BACKUP_FILE"; then
        DB_BACKUP_OK=true
    fi
else
    echo "❌ ОШИБКА: Контейнер PostgreSQL не запущен и утилита pg_dumpall не найдена."
fi

if [ "$DB_BACKUP_OK" = true ] && [ -s "$DB_BACKUP_FILE" ]; then
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    echo "  -> Дамп БД успешно создан: $DB_BACKUP_FILE ($DB_SIZE)"
else
    echo "❌ ОШИБКА: Не удалось создать дамп базы данных PostgreSQL."
    echo "Резервное копирование ПРЕРВАНО. Ретенция не выполняется, чтобы не"
    echo "удалить последнюю рабочую копию из-за временного сбоя."
    rm -f "$DB_BACKUP_FILE"
    exit 1
fi

# 2. File Storage Backup (best-effort: absence of uploads is not a failure,
# but a failed archive of a non-empty directory still aborts via `set -e`).
STORAGE_DIR="uploads"
if [ -d "$STORAGE_DIR" ] && [ "$(ls -A "$STORAGE_DIR" 2>/dev/null)" ]; then
    echo "📁 [2/2] Архивация каталога файлов и чертежей ($STORAGE_DIR)..."
    tar -czf "$STORAGE_BACKUP_FILE" -C "$STORAGE_DIR" .
    STORAGE_SIZE=$(du -h "$STORAGE_BACKUP_FILE" | cut -f1)
    echo "  -> Архив хранилища создан: $STORAGE_BACKUP_FILE ($STORAGE_SIZE)"
else
    echo "📁 [2/2] Каталог $STORAGE_DIR пуст или отсутствует. Пропуск."
fi

# 3. Retention Cleanup — only reached if the database dump above succeeded.
echo "🧹 Очистка устаревших резервных копий старше $RETENTION_DAYS дней..."
find "$BACKUP_DIR" -type f -name "ems_*.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

echo "======================================================================"
echo "✅ Резервное копирование EMS Platform успешно завершено!"
echo "======================================================================"
