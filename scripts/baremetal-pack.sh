#!/bin/bash
# ==============================================================================
# EMS Platform — Baremetal Air-Gapped Packaging Script (Linux / macOS)
# ==============================================================================
# Run this script on a build workstation to create a self-contained offline
# baremetal bundle with all compiled assets and node_modules pre-packaged.
# ==============================================================================
set -euo pipefail

PACKAGE_DIR="ems-baremetal-bundle"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_NAME="ems-baremetal-bundle-${TIMESTAMP}.tar.gz"

echo "======================================================================"
echo "📦 EMS Platform — Подготовка пакета для Baremetal (No Docker) развертывания"
echo "======================================================================"

# 1. Check Node.js and PNPM
if ! command -v node &> /dev/null; then
    echo "❌ Ошибка: Node.js не установлен на сборочной машине."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ Ошибка: pnpm не установлен на сборочной машине."
    exit 1
fi

echo " Node.js: $(node -v)"
echo " pnpm: $(pnpm -v)"

# 2. Install dependencies & Generate Prisma Client
echo "⬇️ Проверка и установка зависимостей..."
pnpm install --frozen-lockfile

echo "🔨 Генерация Prisma Client..."
pnpm --filter @ems/database generate

# 3. Build Next.js Production Bundle
echo "🏗️ Сборка Next.js Production билд..."
pnpm build

# 4. Clean & Prepare Package Directory
echo "📁 Формирование структуры дистрибутива (${PACKAGE_DIR})..."
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/apps/web"
mkdir -p "$PACKAGE_DIR/packages"
mkdir -p "$PACKAGE_DIR/scripts"
mkdir -p "$PACKAGE_DIR/docs"
mkdir -p "$PACKAGE_DIR/uploads"

# 5. Copy Build Artifacts and Code
echo "📄 Копирование скомпилированных файлов и пакетов..."
# Apps
cp -r apps/web/.next "$PACKAGE_DIR/apps/web/.next"
cp -r apps/web/public "$PACKAGE_DIR/apps/web/public" 2>/dev/null || mkdir -p "$PACKAGE_DIR/apps/web/public"
cp apps/web/package.json "$PACKAGE_DIR/apps/web/package.json"
cp apps/web/next.config.mjs "$PACKAGE_DIR/apps/web/next.config.mjs"

# Packages
cp -r packages/auth "$PACKAGE_DIR/packages/auth"
cp -r packages/database "$PACKAGE_DIR/packages/database"
cp -r packages/shared "$PACKAGE_DIR/packages/shared"

# Root configs & metadata
cp package.json "$PACKAGE_DIR/package.json"
cp pnpm-workspace.yaml "$PACKAGE_DIR/pnpm-workspace.yaml"
cp pnpm-lock.yaml "$PACKAGE_DIR/pnpm-lock.yaml"
cp .env.production.example "$PACKAGE_DIR/.env.production.example"

# Node Modules (Complete pre-installed dependencies with binaries)
echo "📦 Включение предустановленных node_modules (автономный режим)..."
cp -rL node_modules "$PACKAGE_DIR/node_modules"

# Scripts & Systemd
cp scripts/baremetal-install.sh "$PACKAGE_DIR/install.sh"
cp scripts/baremetal-install.ps1 "$PACKAGE_DIR/install.ps1" 2>/dev/null || true
cp scripts/ems-platform.service "$PACKAGE_DIR/scripts/ems-platform.service"
cp scripts/ems-baremetal.nginx.conf "$PACKAGE_DIR/scripts/ems-baremetal.nginx.conf"
cp scripts/backup.sh "$PACKAGE_DIR/scripts/backup.sh"

if [ -f "docs/BAREMETAL_OFFLINE_DEPLOYMENT.md" ]; then
    cp docs/BAREMETAL_OFFLINE_DEPLOYMENT.md "$PACKAGE_DIR/docs/"
    cp docs/BAREMETAL_OFFLINE_DEPLOYMENT.md "$PACKAGE_DIR/README.md"
fi

chmod +x "$PACKAGE_DIR/install.sh" "$PACKAGE_DIR/scripts/backup.sh"

# 6. Create Tarball
echo "🗜️ Создание итогового tar.gz архива: ${ARCHIVE_NAME}..."
tar -czf "$ARCHIVE_NAME" "$PACKAGE_DIR"

echo "======================================================================"
echo "✅ Пакет для автономного Baremetal развертывания успешно сформирован!"
echo "📦 Архив: ${ARCHIVE_NAME}"
echo "📁 Папка: ${PACKAGE_DIR}/"
echo ""
echo "👉 Шаги по переносу на закрытую ВМ:"
echo "1. Перенесите файл '${ARCHIVE_NAME}' на целевую ВМ (флешка/SCP)."
echo "2. Распакуйте: tar -xzf ${ARCHIVE_NAME}"
echo "3. Перейдите в каталог: cd ${PACKAGE_DIR}"
echo "4. Запустите инсталлятор: sudo ./install.sh"
echo "======================================================================"
