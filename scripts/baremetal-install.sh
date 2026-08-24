#!/bin/bash
# ==============================================================================
# EMS Platform — Baremetal Offline Installation & Systemd Service Setup
# ==============================================================================
# Run this script on the ISOLATED TARGET LINUX VM (NO DOCKER, NO INTERNET).
# ==============================================================================
set -euo pipefail

INSTALL_DIR="/opt/ems-platform"
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================================================"
echo "🚀 EMS Platform — Автономная Baremetal установка на Linux (без Docker)"
echo "======================================================================"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
    echo "⚠️ Внимание: Для установки systemd-службы требуются права суперпользователя."
    echo "Пожалуйста, запустите скрипт через: sudo ./install.sh"
    exit 1
fi

# 2. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Ошибка: Node.js не найден в системе."
    echo "ℹ️ Установите Node.js (v18, v20 или v22) из локального пакета deb/rpm."
    exit 1
fi
echo "✅ Node.js обнаружен: $(node -v)"

# 3. Create System User and Group
if ! id "ems" &>/dev/null; then
    echo "👤 Создание системного пользователя 'ems'..."
    useradd -r -s /bin/false -d "$INSTALL_DIR" -m ems 2>/dev/null || useradd -r -s /bin/false ems
fi

# 4. Copy/Install Files to /opt/ems-platform
if [ "$CURRENT_DIR" != "$INSTALL_DIR" ]; then
    echo "📁 Копирование файлов платформы в ${INSTALL_DIR}..."
    mkdir -p "$INSTALL_DIR"
    cp -r "$CURRENT_DIR"/* "$INSTALL_DIR/"
    cp -r "$CURRENT_DIR"/.[!.]* "$INSTALL_DIR/" 2>/dev/null || true
fi

cd "$INSTALL_DIR"

# 5. Setup Production Environment (.env.production)
if [ ! -f ".env.production" ]; then
    echo "⚙️ Создание файла конфигурации .env.production..."
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env.production
    else
        cat << 'EOF' > .env.production
DATABASE_URL="postgresql://ems_user:ems_secure_password@localhost:5432/ems_db?schema=public"
JWT_SECRET="super_secret_jwt_key_ems_platform_production_change_me_32chars"
PORT=3000
NODE_ENV=production
UPLOAD_DIR="/opt/ems-platform/uploads"
EOF
    fi

    # Generate random JWT Secret
    if command -v openssl &> /dev/null; then
        RANDOM_JWT=$(openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | head -c 48)
        sed -i "s/GENERATE_RANDOM_SECRET_KEY_MINIMUM_32_CHARACTERS_HERE/$RANDOM_JWT/" .env.production 2>/dev/null || true
    fi
    echo "✅ Файл .env.production сформирован."
    echo "ℹ️ Проверьте настройки подключения к PostgreSQL в файле ${INSTALL_DIR}/.env.production"
fi

# 6. Prepare uploads directory
mkdir -p "$INSTALL_DIR/uploads"
chown -R ems:ems "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"

# 7. Push Database Schema via local Prisma Engine
echo "🗄️ Синхронизация схемы базы данных PostgreSQL..."
set +e
su -s /bin/sh ems -c "cd '$INSTALL_DIR' && ./packages/database/node_modules/.bin/prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss"
PRISMA_STATUS=$?
set -e

if [ $PRISMA_STATUS -ne 0 ]; then
    echo "⚠️ Внимание: Не удалось автоматически синхронизировать схему БД."
    echo "Убедитесь, что служба PostgreSQL запущена, база данных создана и пароль в .env.production верен:"
    echo "  sudo systemctl status postgresql"
    echo "  sudo -u postgres psql -c \"CREATE USER ems_user WITH PASSWORD 'ems_secure_password';\""
    echo "  sudo -u postgres psql -c \"CREATE DATABASE ems_db OWNER ems_user;\""
fi

# 8. Setup & Enable Systemd Service
echo "⚙️ Регистрация системной службы systemd (ems-platform.service)..."
SERVICE_FILE="/etc/systemd/system/ems-platform.service"

cp "$INSTALL_DIR/scripts/ems-platform.service" "$SERVICE_FILE"
chmod 644 "$SERVICE_FILE"

systemctl daemon-reload
systemctl enable ems-platform
systemctl restart ems-platform

# 9. Healthcheck Loop
echo "⏳ Проверка запуска приложения..."
sleep 3

MAX_RETRIES=20
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f http://127.0.0.1:3000/api/system/health > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Ожидание старта сервера ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
done

echo "======================================================================"
if [ "$HEALTHY" = true ]; then
    echo "🎉 EMS Platform успешно установлена и запущена в фоновом режиме!"
    echo "======================================================================"
    echo "🌐 Прямой доступ: http://localhost:3000/ или http://<IP-адрес-ВМ>:3000/"
    echo ""
    echo "🔧 Управление службой:"
    echo "  - Статус:       sudo systemctl status ems-platform"
    echo "  - Перезапуск:   sudo systemctl restart ems-platform"
    echo "  - Журнал логов: sudo journalctl -u ems-platform -f"
    echo ""
    echo "🛡️ Настройка Nginx (опционально для порта 80/443):"
    echo "  sudo cp /opt/ems-platform/scripts/ems-baremetal.nginx.conf /etc/nginx/sites-available/ems"
    echo "  sudo ln -s /etc/nginx/sites-available/ems /etc/nginx/sites-enabled/"
    echo "  sudo nginx -t && sudo systemctl reload nginx"
    echo "======================================================================"
else
    echo "⚠️ Служба зарегистрирована, но порт 3000 пока не отвечает."
    echo "Проверьте журнал ошибок:"
    echo "  sudo journalctl -u ems-platform -n 50 --no-pager"
    echo "======================================================================"
fi
