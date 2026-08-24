#!/bin/bash
# ==============================================================================
# EMS Platform — Air-Gapped Packaging Script (Linux / macOS)
# ==============================================================================
# Run this script on a machine WITH internet access to create an offline bundle
# that can be transferred to an isolated VM with ZERO internet connectivity.
# ==============================================================================
set -euo pipefail

PACKAGE_DIR="ems-airgap-bundle"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_NAME="ems-airgap-bundle-${TIMESTAMP}.tar.gz"

echo "======================================================================"
echo "📦 EMS Platform — Подготовка пакета для автономного (Air-Gap) развертывания"
echo "======================================================================"

# 1. Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Ошибка: Docker не установлен на текущей машине."
    exit 1
fi

# 2. Build Web Application Image
echo "🔨 Сборка Docker-образа приложения EMS Platform (ems-platform:latest)..."
docker build -t ems-platform:latest -f Dockerfile .

# 3. Pull Third-Party Base Images
echo "⬇️ Загрузка базовых образов (PostgreSQL 16 Alpine, Nginx Alpine)..."
docker pull postgres:16-alpine
docker pull nginx:alpine

# 4. Clean & Prepare Package Directory
echo "📁 Создание структуры каталога поставки (${PACKAGE_DIR})..."
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/images"
mkdir -p "$PACKAGE_DIR/docker/nginx/ssl"
mkdir -p "$PACKAGE_DIR/scripts"
mkdir -p "$PACKAGE_DIR/docs"
mkdir -p "$PACKAGE_DIR/uploads"

# 5. Export Docker Images to Tarball
echo "💾 Экспорт Docker-образов в локальный архив (images/ems-images-bundle.tar.gz)..."
docker save ems-platform:latest postgres:16-alpine nginx:alpine | gzip > "$PACKAGE_DIR/images/ems-images-bundle.tar.gz"

# 6. Copy Configurations and Deployment Files
echo "📄 Копирование конфигурационных файлов и скриптов..."
cp docker-compose.offline.yml "$PACKAGE_DIR/docker-compose.yml"
cp docker/nginx/nginx.conf "$PACKAGE_DIR/docker/nginx/nginx.conf"
cp .env.production.example "$PACKAGE_DIR/.env.production.example"
cp scripts/airgap-install.sh "$PACKAGE_DIR/install.sh"
cp scripts/airgap-install.ps1 "$PACKAGE_DIR/install.ps1"
cp scripts/backup.sh "$PACKAGE_DIR/scripts/backup.sh"
cp scripts/backup.ps1 "$PACKAGE_DIR/scripts/backup.ps1"

if [ -f "docs/AIRGAP_OFFLINE_DEPLOYMENT.md" ]; then
    cp docs/AIRGAP_OFFLINE_DEPLOYMENT.md "$PACKAGE_DIR/docs/"
    cp docs/AIRGAP_OFFLINE_DEPLOYMENT.md "$PACKAGE_DIR/README.md"
fi

chmod +x "$PACKAGE_DIR/install.sh" "$PACKAGE_DIR/scripts/backup.sh"

# 7. Create Final Transferable Archive
echo "🗜️ Создание итогового дистрибутива: ${ARCHIVE_NAME}..."
tar -czf "$ARCHIVE_NAME" "$PACKAGE_DIR"

echo "======================================================================"
echo "✅ Пакет для автономного развертывания успешно сформирован!"
echo "📦 Архив: ${ARCHIVE_NAME}"
echo "📁 Каталог: ${PACKAGE_DIR}/"
echo ""
echo "👉 Инструкция по переносу на закрытую ВМ:"
echo "1. Скопируйте файл '${ARCHIVE_NAME}' на изолированную ВМ (через флешку/SFTP/SCP)."
echo "2. На целевой ВМ распакуйте архив: tar -xzf ${ARCHIVE_NAME} && cd ${PACKAGE_DIR}"
echo "3. Запустите автономный инсталлятор: ./install.sh (или .\install.ps1 в Windows)"
echo "======================================================================"
