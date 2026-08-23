#!/bin/bash
# ==============================================================================
# EMS Platform — Production Backup Utility (Database + Storage)
# ==============================================================================
# Performs:
#   1. PostgreSQL Database Dump (via Docker container or pg_dump)
#   2. Local file storage archive (uploads/)
#   3. Auto-retention policy (deletes backups older than 30 days)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="${BACKUP_DIR}/ems_database_${TIMESTAMP}.sql.gz"
STORAGE_BACKUP_FILE="${BACKUP_DIR}/ems_storage_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "======================================================================"
echo "💾 EMS Platform — Запуск создания резервной копии ($TIMESTAMP)"
echo "======================================================================"

# 1. PostgreSQL Database Backup
echo "📦 [1/2] Создание дампа базы данных PostgreSQL..."
CONTAINER_NAME="ems_postgres_prod"
if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
    CONTAINER_NAME="ems_postgres"
fi

if docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
    docker exec -t "$CONTAINER_NAME" pg_dumpall -c -U postgres | gzip > "$DB_BACKUP_FILE"
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    echo "  -> Дамп БД успешно создан из контейнера $CONTAINER_NAME: $DB_BACKUP_FILE ($DB_SIZE)"
elif command -v pg_dumpall &> /dev/null; then
    pg_dumpall -U postgres -h localhost | gzip > "$DB_BACKUP_FILE"
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    echo "  -> Дамп БД создан через локальный pg_dumpall: $DB_BACKUP_FILE ($DB_SIZE)"
else
    echo "⚠️ Контейнер PostgreSQL не запущен и утилита pg_dumpall не найдена. Пропуск дампа БД."
fi

# 2. File Storage Backup
STORAGE_DIR="uploads"
if [ -d "$STORAGE_DIR" ] && [ "$(ls -A "$STORAGE_DIR" 2>/dev/null)" ]; then
    echo "📁 [2/2] Архивация каталога файлов и чертежей ($STORAGE_DIR)..."
    tar -czf "$STORAGE_BACKUP_FILE" -C "$STORAGE_DIR" .
    STORAGE_SIZE=$(du -h "$STORAGE_BACKUP_FILE" | cut -f1)
    echo "  -> Архив хранилища создан: $STORAGE_BACKUP_FILE ($STORAGE_SIZE)"
else
    echo "📁 [2/2] Каталог $STORAGE_DIR пуст или отсутствует. Пропуск."
fi

# 3. Retention Cleanup
echo "🧹 Очистка устаревших резервных копий старше $RETENTION_DAYS дней..."
find "$BACKUP_DIR" -type f -name "ems_*.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

echo "======================================================================"
echo "✅ Резервное копирование EMS Platform успешно завершено!"
echo "======================================================================"
