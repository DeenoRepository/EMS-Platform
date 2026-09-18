#!/usr/bin/env bash
set -euo pipefail

if [[ "${WMS_MIGRATION_APPROVED:-}" != "1" ]]; then
  echo "Refusing WMS migration: set WMS_MIGRATION_APPROVED=1 after backup and review." >&2
  exit 2
fi
if [[ "${WMS_BACKUP_VERIFIED:-}" != "1" ]]; then
  echo "Refusing WMS migration: set WMS_BACKUP_VERIFIED=1 after backup restore verification." >&2
  exit 2
fi
if [[ "${WMS_BASELINE_VERIFIED:-}" != "1" ]]; then
  echo "Refusing WMS migration: set WMS_BASELINE_VERIFIED=1 after schema baseline review." >&2
  exit 2
fi

: "${DATABASE_URL:?DATABASE_URL is required}"
SCHEMA_FILE="${WMS_MIGRATION_FILE:-packages/database/prisma/migrations/20260918000000_wms_reservations/migration.sql}"
[[ -f "$SCHEMA_FILE" ]] || { echo "Migration file not found: $SCHEMA_FILE" >&2; exit 2; }

case "$DATABASE_URL" in
  *localhost*|*127.0.0.1*|*::1*) ;;
  *)
    if [[ "${WMS_ALLOW_PRODUCTION_TARGET:-}" != "1" ]]; then
      echo "Refusing non-local target. Set WMS_ALLOW_PRODUCTION_TARGET=1 only during approved maintenance window." >&2
      exit 2
    fi
    ;;
esac

echo "Applying additive WMS migration: $SCHEMA_FILE"
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"
echo "WMS migration completed. Run Prisma Client generation and smoke tests next."
