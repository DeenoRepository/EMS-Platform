#!/bin/bash
# ==============================================================================
# EMS-Platform: Production Database & Storage Backup Script
# ==============================================================================
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ems}"
STORAGE_DIR="${STORAGE_DIR:-./uploads}"
POSTGRES_DB="${POSTGRES_DB:-ems_db}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

mkdir -p "$BACKUP_DIR"

echo "======================================================"
echo "[EMS BACKUP] Starting full backup at $(date)"
echo "[EMS BACKUP] Output directory: $BACKUP_DIR"
echo "======================================================"

# 1. PostgreSQL Database Dump
DB_BACKUP_FILE="$BACKUP_DIR/ems_db_$TIMESTAMP.sql.gz"
echo "[1/2] Creating PostgreSQL database dump..."
pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "$DB_BACKUP_FILE"
echo "  -> Database dump created: $DB_BACKUP_FILE ($(du -h "$DB_BACKUP_FILE" | cut -f1))"

# 2. File Storage Archive
if [ -d "$STORAGE_DIR" ]; then
  STORAGE_BACKUP_FILE="$BACKUP_DIR/ems_storage_$TIMESTAMP.tar.gz"
  echo "[2/2] Archiving local documents and photos storage..."
  tar -czf "$STORAGE_BACKUP_FILE" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
  echo "  -> Storage archive created: $STORAGE_BACKUP_FILE ($(du -h "$STORAGE_BACKUP_FILE" | cut -f1))"
else
  echo "[2/2] Storage directory not found at $STORAGE_DIR, skipping storage archive."
fi

# 3. Retention policy: remove backups older than 30 days
echo "[CLEANUP] Cleaning up backups older than 30 days..."
find "$BACKUP_DIR" -name "ems_db_*.sql.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "ems_storage_*.tar.gz" -mtime +30 -delete

echo "======================================================"
echo "[EMS BACKUP] Backup successfully completed at $(date)"
echo "======================================================"
