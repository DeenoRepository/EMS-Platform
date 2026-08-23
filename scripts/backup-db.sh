#!/bin/bash
# ==============================================================================
# EMS Platform — Production PostgreSQL Backup Utility
# ==============================================================================
set -euo pipefail

BACKUP_DIR="backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ems_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "💾 Создание резервной копии базы данных EMS Platform..."

# Identify container
CONTAINER_NAME="ems_postgres_prod"
if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
    CONTAINER_NAME="ems_postgres"
fi

if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
    echo "❌ Ошибка: Контейнер PostgreSQL не запущен."
    exit 1
fi

docker exec -t "$CONTAINER_NAME" pg_dumpall -c -U postgres | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Резервная копия успешно создана: ${BACKUP_FILE} (${FILESIZE})"

# Retain backups for last 30 days
find "$BACKUP_DIR" -type f -name "ems_backup_*.sql.gz" -mtime +30 -delete || true
echo "🧹 Старые бэкапы (> 30 дней) очищены."
