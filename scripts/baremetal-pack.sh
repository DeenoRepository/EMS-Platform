#!/bin/bash
# ==============================================================================
# EMS Platform — Production Clean Baremetal Packaging Script
# ==============================================================================
# Builds and creates a clean, lightweight, fully self-contained offline bundle.
# Excludes: .agents (skills), .git, .turbo, .next/cache, dev scratchpads.
# ==============================================================================
set -euo pipefail

PACKAGE_DIR="ems-baremetal-release"
ARCHIVE_NAME="ems-baremetal-release.tar.gz"

echo "======================================================================"
echo "📦 EMS Platform — Подготовка чистого Production Baremetal релиза"
echo "======================================================================"

# 1. Clean previous build archives and target folder
rm -rf "$PACKAGE_DIR" "$ARCHIVE_NAME"

# 2. Build Prisma and Next.js Production bundle
echo "🔨 Проверка Prisma Client и Next.js Production билда..."
pnpm --filter @ems/database generate
pnpm build

# 3. Create Package Directory
echo "📁 Формирование чистой структуры дистрибутива..."
mkdir -p "$PACKAGE_DIR/apps/web"
mkdir -p "$PACKAGE_DIR/packages"
mkdir -p "$PACKAGE_DIR/scripts"
mkdir -p "$PACKAGE_DIR/docs"
mkdir -p "$PACKAGE_DIR/uploads"

# 4. Copy Web App (including all Next.js App Router manifests, excluding cache/trace)
echo "📄 Копирование скомпилированного Next.js приложения..."
cp -r apps/web/.next "$PACKAGE_DIR/apps/web/.next"
rm -rf "$PACKAGE_DIR/apps/web/.next/cache" "$PACKAGE_DIR/apps/web/.next/trace"

# Copy Prisma query engine binaries directly next to Next.js server bundle for runtime resolution
find node_modules -name "libquery_engine*.so.node" -exec cp {} "$PACKAGE_DIR/apps/web/.next/server/" \; 2>/dev/null || true
mkdir -p "$PACKAGE_DIR/apps/web/.prisma/client"
find node_modules -name "libquery_engine*.so.node" -exec cp {} "$PACKAGE_DIR/apps/web/.prisma/client/" \; 2>/dev/null || true

if [ -d "apps/web/public" ]; then
    cp -r apps/web/public "$PACKAGE_DIR/apps/web/public"
fi
cp apps/web/package.json "$PACKAGE_DIR/apps/web/package.json"
cp apps/web/next.config.mjs "$PACKAGE_DIR/apps/web/next.config.mjs"

# Copy internal packages
echo "📄 Копирование внутренних модулей (@ems/auth, @ems/database, @ems/shared)..."
cp -r packages/auth "$PACKAGE_DIR/packages/auth"
cp -r packages/database "$PACKAGE_DIR/packages/database"
cp -r packages/shared "$PACKAGE_DIR/packages/shared"

# Copy root manifest & config
cp package.json "$PACKAGE_DIR/package.json"
cp pnpm-workspace.yaml "$PACKAGE_DIR/pnpm-workspace.yaml"
cp pnpm-lock.yaml "$PACKAGE_DIR/pnpm-lock.yaml"
cp .env.production.example "$PACKAGE_DIR/.env.production.example"

# 5. Copy node_modules (preserving symlinks)
echo "📦 Копирование предустановленных node_modules..."
cp -a node_modules "$PACKAGE_DIR/"
if [ -d "apps/web/node_modules" ]; then
    cp -a apps/web/node_modules "$PACKAGE_DIR/apps/web/"
fi
if [ -d "packages/auth/node_modules" ]; then
    cp -a packages/auth/node_modules "$PACKAGE_DIR/packages/auth/"
fi
if [ -d "packages/database/node_modules" ]; then
    cp -a packages/database/node_modules "$PACKAGE_DIR/packages/database/"
fi
if [ -d "packages/shared/node_modules" ]; then
    cp -a packages/shared/node_modules "$PACKAGE_DIR/packages/shared/"
fi

# Clean unnecessary cache files from inside node_modules if any
rm -rf "$PACKAGE_DIR/node_modules/.cache"

# 6. Copy deployment scripts, configs, and documentation
echo "⚙️ Копирование скриптов запуска, systemd и документации..."
cp scripts/baremetal-install.sh "$PACKAGE_DIR/install.sh"
cp scripts/ems-platform.service "$PACKAGE_DIR/scripts/ems-platform.service"
cp scripts/ems-baremetal.nginx.conf "$PACKAGE_DIR/scripts/ems-baremetal.nginx.conf"
cp scripts/backup.sh "$PACKAGE_DIR/scripts/backup.sh"
cp scripts/*.js "$PACKAGE_DIR/scripts/" 2>/dev/null || true
cp scripts/*.sql "$PACKAGE_DIR/scripts/" 2>/dev/null || true
if [ -d "temp" ]; then
    mkdir -p "$PACKAGE_DIR/temp"
    cp -r temp/* "$PACKAGE_DIR/temp/" 2>/dev/null || true
fi
if [ -f "temp/init_custom_sections.sql" ]; then
    cp temp/init_custom_sections.sql "$PACKAGE_DIR/scripts/init_custom_sections.sql"
fi
cp docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md "$PACKAGE_DIR/docs/"
cp docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md "$PACKAGE_DIR/README.md"

chmod +x "$PACKAGE_DIR/install.sh" "$PACKAGE_DIR/scripts/backup.sh"

# 7. Compress into portable tar.gz
echo "🗜️ Архивация в ${ARCHIVE_NAME}..."
tar -czf "$ARCHIVE_NAME" "$PACKAGE_DIR"

BUNDLE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)

echo "======================================================================"
echo "✅ Чистый Production билд готов для переноса!"
echo "📦 Архив: ${ARCHIVE_NAME} (${BUNDLE_SIZE})"
echo "📁 Папка релиза: ${PACKAGE_DIR}/"
echo ""
echo "🚫 Исключено из архива: .agents (скиллы), .git, .turbo, dev-кэш."
echo "======================================================================"
