#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${EMS_INSTALL_DIR:-/opt/ems-platform}"
SERVICE_NAME="${EMS_SERVICE_NAME:-ems-platform}"
BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${EMS_BACKUP_DIR:-/var/backups/ems-platform}"
STAMP="$(date +%Y%m%d_%H%M%S)"
ROLLBACK_ARCHIVE="$BACKUP_DIR/app-before-eps-doc-model-$STAMP.tar.gz"

if [[ "${EMS_PATCH_APPROVED:-}" != "1" ]]; then
  echo "Patch is not approved. Set EMS_PATCH_APPROVED=1." >&2
  exit 2
fi
if [[ "$EUID" -ne 0 ]]; then
  echo "Run as root: sudo env EMS_PATCH_APPROVED=1 $0" >&2
  exit 2
fi
if [[ ! -f "$INSTALL_DIR/.env.production" ]]; then
  echo "Existing production environment not found: $INSTALL_DIR/.env.production" >&2
  exit 2
fi
if [[ ! -f "$BUNDLE_DIR/apps/web/.next/BUILD_ID" ]]; then
  echo "Patch bundle is incomplete: apps/web/.next/BUILD_ID is missing" >&2
  exit 2
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "Creating application rollback archive: $ROLLBACK_ARCHIVE"
tar -czf "$ROLLBACK_ARCHIVE" -C "$INSTALL_DIR" apps/web/.next
chmod 600 "$ROLLBACK_ARCHIVE"

systemctl stop "$SERVICE_NAME"
PATCH_OK=0
trap 'if [[ "$PATCH_OK" -ne 1 ]]; then echo "Patch failed. Restore $ROLLBACK_ARCHIVE" >&2; systemctl start "$SERVICE_NAME" || true; fi' EXIT

echo "Replacing compiled Next.js application"
rm -rf "$INSTALL_DIR/apps/web/.next"
cp -a "$BUNDLE_DIR/apps/web/.next" "$INSTALL_DIR/apps/web/.next"
if [[ -d "$BUNDLE_DIR/apps/web/public" ]]; then
  rm -rf "$INSTALL_DIR/apps/web/public"
  cp -a "$BUNDLE_DIR/apps/web/public" "$INSTALL_DIR/apps/web/public"
fi
chown -R ems:ems "$INSTALL_DIR/apps/web/.next" "$INSTALL_DIR/apps/web/public" 2>/dev/null || true

systemctl start "$SERVICE_NAME"
for attempt in $(seq 1 30); do
  if curl --silent --fail http://127.0.0.1:3000/api/system/health >/dev/null; then
    PATCH_OK=1
    trap - EXIT
    echo "Patch applied successfully"
    echo "Rollback archive: $ROLLBACK_ARCHIVE"
    exit 0
  fi
  sleep 2
done

echo "Healthcheck failed" >&2
exit 1
