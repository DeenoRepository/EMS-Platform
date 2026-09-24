#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="ems-eps-document-model-patch"
ARCHIVE_NAME="${PACKAGE_DIR}.tar.gz"

rm -rf "$PACKAGE_DIR" "$ARCHIVE_NAME"

echo "Building current production application"
pnpm build

mkdir -p "$PACKAGE_DIR/apps/web" "$PACKAGE_DIR/scripts" "$PACKAGE_DIR/docs"
cp -a apps/web/.next "$PACKAGE_DIR/apps/web/.next"
rm -rf "$PACKAGE_DIR/apps/web/.next/cache" "$PACKAGE_DIR/apps/web/.next/trace"
if [[ -d apps/web/public ]]; then
  cp -a apps/web/public "$PACKAGE_DIR/apps/web/public"
fi
cp scripts/baremetal-overlay-patch.sh "$PACKAGE_DIR/scripts/baremetal-overlay-patch.sh"
cp docs/EPS_DOCUMENT_MODEL_PATCH.md "$PACKAGE_DIR/docs/EPS_DOCUMENT_MODEL_PATCH.md"
chmod +x "$PACKAGE_DIR/scripts/baremetal-overlay-patch.sh"

tar -czf "$ARCHIVE_NAME" "$PACKAGE_DIR"
sha256sum "$ARCHIVE_NAME" >"${ARCHIVE_NAME}.sha256"

if [[ -d /mnt/hgfs/Shared ]]; then
  cp "$ARCHIVE_NAME" "${ARCHIVE_NAME}.sha256" /mnt/hgfs/Shared/
fi

echo "Patch archive: $ARCHIVE_NAME"
cat "${ARCHIVE_NAME}.sha256"
