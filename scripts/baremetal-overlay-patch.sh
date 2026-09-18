#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${EMS_INSTALL_DIR:-/opt/ems-platform}"
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${EMS_SERVICE_NAME:-ems-platform}"
BACKUP_ROOT="${EMS_BACKUP_DIR:-/var/backups/ems-platform}"
STAMP="$(date +%Y%m%d_%H%M%S)"
APP_ROLLBACK="$BACKUP_ROOT/app-before-wms-patch-$STAMP.tar.gz"
DB_BACKUP="$BACKUP_ROOT/db-before-wms-patch-$STAMP.dump"

if [[ "${WMS_PATCH_APPROVED:-}" != "1" ]]; then
  echo "Refusing overlay patch: set WMS_PATCH_APPROVED=1 after review and maintenance approval." >&2
  exit 2
fi
if [[ "$EUID" -ne 0 ]]; then
  echo "Run the overlay patch as root: sudo WMS_PATCH_APPROVED=1 $0" >&2
  exit 2
fi
if [[ ! -f "$INSTALL_DIR/.env.production" ]]; then
  echo "Production environment not found: $INSTALL_DIR/.env.production" >&2
  exit 2
fi
if [[ ! -f "$CURRENT_DIR/apps/web/.next/BUILD_ID" ]]; then
  echo "Release bundle is incomplete: apps/web/.next/BUILD_ID is missing" >&2
  exit 2
fi
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required for the pre-patch database backup" >&2
  exit 2
fi

set -a
# shellcheck disable=SC1091
. "$INSTALL_DIR/.env.production"
set +a
: "${DATABASE_URL:?DATABASE_URL is missing in .env.production}"

mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

echo "Creating database backup: $DB_BACKUP"
pg_dump --format=custom --file="$DB_BACKUP" "$DATABASE_URL"
chmod 600 "$DB_BACKUP"
pg_restore --list "$DB_BACKUP" >/dev/null

echo "Creating application rollback archive: $APP_ROLLBACK"
tar -czf "$APP_ROLLBACK" \
  -C "$INSTALL_DIR" \
  apps packages scripts package.json pnpm-lock.yaml pnpm-workspace.yaml \
  --exclude='apps/web/.next/cache' \
  --exclude='uploads'
chmod 600 "$APP_ROLLBACK"

systemctl stop "$SERVICE_NAME"
PATCH_FAILED=1
trap 'if [[ "$PATCH_FAILED" -eq 1 ]]; then echo "Patch failed. Application files can be restored from $APP_ROLLBACK" >&2; systemctl start "$SERVICE_NAME" || true; fi' EXIT

echo "Overlaying application files; existing .env* and uploads are preserved"
mkdir -p "$INSTALL_DIR/apps" "$INSTALL_DIR/packages" "$INSTALL_DIR/scripts" "$INSTALL_DIR/docs"
cp -a "$CURRENT_DIR/apps/." "$INSTALL_DIR/apps/"
cp -a "$CURRENT_DIR/packages/." "$INSTALL_DIR/packages/"
cp -a "$CURRENT_DIR/node_modules" "$INSTALL_DIR/"
cp -a "$CURRENT_DIR/scripts/." "$INSTALL_DIR/scripts/"
cp -a "$CURRENT_DIR/docs/." "$INSTALL_DIR/docs/"
cp -a "$CURRENT_DIR/package.json" "$CURRENT_DIR/pnpm-lock.yaml" "$CURRENT_DIR/pnpm-workspace.yaml" "$INSTALL_DIR/"

chown -R ems:ems "$INSTALL_DIR/apps" "$INSTALL_DIR/packages" "$INSTALL_DIR/scripts" "$INSTALL_DIR/docs" "$INSTALL_DIR/node_modules" "$INSTALL_DIR/package.json" "$INSTALL_DIR/pnpm-lock.yaml" "$INSTALL_DIR/pnpm-workspace.yaml"

if [[ "${WMS_PATCH_APPLY_MIGRATION:-1}" == "1" ]]; then
  echo "Applying additive WMS migration"
  WMS_MIGRATION_APPROVED=1 \
  WMS_BACKUP_VERIFIED=1 \
  WMS_BASELINE_VERIFIED="${WMS_BASELINE_VERIFIED:-0}" \
  WMS_ALLOW_PRODUCTION_TARGET="${WMS_ALLOW_PRODUCTION_TARGET:-0}" \
  DATABASE_URL="$DATABASE_URL" \
  bash "$INSTALL_DIR/scripts/apply-wms-migration.sh"
fi

systemctl daemon-reload
systemctl start "$SERVICE_NAME"

for attempt in $(seq 1 30); do
  if curl --silent --fail http://127.0.0.1:3000/api/system/health >/dev/null; then
    PATCH_FAILED=0
    trap - EXIT
    echo "Overlay patch completed successfully"
    echo "Database backup: $DB_BACKUP"
    echo "Application rollback archive: $APP_ROLLBACK"
    exit 0
  fi
  sleep 2
done

echo "Healthcheck failed after overlay patch" >&2
exit 1
