#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="${1:-ems-eps-registry-filter-patch}"
ARCHIVE_NAME="${PACKAGE_DIR}.tar.gz"

rm -rf "$PACKAGE_DIR" "$ARCHIVE_NAME"

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "Building current production application"
  rm -rf apps/web/.next .turbo
  pnpm --filter @ems/database generate
  pnpm build
else
  echo "Using prebuilt and compatibility-tested apps/web/.next"
  [[ -f apps/web/.next/BUILD_ID ]] || { echo "apps/web/.next/BUILD_ID is missing" >&2; exit 2; }
fi

mkdir -p "$PACKAGE_DIR/apps/web" "$PACKAGE_DIR/scripts" "$PACKAGE_DIR/docs"
cp -a apps/web/.next "$PACKAGE_DIR/apps/web/.next"
rm -rf "$PACKAGE_DIR/apps/web/.next/cache" "$PACKAGE_DIR/apps/web/.next/trace"
if [[ -d apps/web/public ]]; then
  cp -a apps/web/public "$PACKAGE_DIR/apps/web/public"
fi
cp scripts/baremetal-overlay-patch.sh "$PACKAGE_DIR/scripts/baremetal-overlay-patch.sh"
if [[ -f docs/EPS_REGISTRY_FILTER_PATCH.md ]]; then
  cp docs/EPS_REGISTRY_FILTER_PATCH.md "$PACKAGE_DIR/docs/"
fi
if [[ -f docs/EPS_DOCUMENT_MODEL_PATCH.md ]]; then
  cp docs/EPS_DOCUMENT_MODEL_PATCH.md "$PACKAGE_DIR/docs/"
fi
chmod +x "$PACKAGE_DIR/scripts/baremetal-overlay-patch.sh"

tar -czf "$ARCHIVE_NAME" "$PACKAGE_DIR"
sha256sum "$ARCHIVE_NAME" >"${ARCHIVE_NAME}.sha256"

if [[ -d /mnt/hgfs/Shared ]]; then
  cp "$ARCHIVE_NAME" "${ARCHIVE_NAME}.sha256" /mnt/hgfs/Shared/
  # Также обновляем архив ems-eps-document-model-patch для совместимости со старыми путями вызова
  cp "$ARCHIVE_NAME" /mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz
  sha256sum /mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz > /mnt/hgfs/Shared/ems-eps-document-model-patch.tar.gz.sha256
fi

echo "Patch archive: $ARCHIVE_NAME"
cat "${ARCHIVE_NAME}.sha256"
