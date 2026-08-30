#!/bin/bash
# ==============================================================================
# EMS Platform — Air-Gapped Offline Installation & Startup Script (Linux/Unix)
# ==============================================================================
# This script runs on the ISOLATED TARGET VIRTUAL MACHINE (NO INTERNET).
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo "🚀 EMS Platform — Автономная установка в закрытом контуре (Air-Gapped)"
echo "======================================================================"

# 1. Check Docker & Compose availability
if ! command -v docker &> /dev/null; then
    echo "❌ Ошибка: Docker Engine не обнаружен на данной ВМ."
    echo "ℹ️ Установите Docker из локальных RPM/DEB пакетов перед запуском."
    exit 1
fi

if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Ошибка: Docker Compose (v2) не обнаружен."
    exit 1
fi

# 2. Load Pre-packaged Docker Images
echo "📦 Загрузка локальных Docker-образов в локальный демон Docker..."
if [ -f "images/ems-images-bundle.tar.gz" ]; then
    echo "  -> Распаковка и импорт images/ems-images-bundle.tar.gz..."
    gunzip -c images/ems-images-bundle.tar.gz | docker load
elif [ -f "images/ems-images-bundle.tar" ]; then
    echo "  -> Импорт images/ems-images-bundle.tar..."
    docker load -i images/ems-images-bundle.tar
else
    echo "⚠️ Архив образов не найден в images/. Проверяем наличие уже загруженных образов..."
    if ! docker image inspect ems-platform:latest &> /dev/null; then
        echo "❌ Ошибка: Образ ems-platform:latest не найден в локальном Docker."
        exit 1
    fi
fi

echo "✅ Docker-образы успешно зарегистрированы в системе."

# 3. Setup Production Environment Variables
if [ ! -f ".env.production" ] && [ ! -f ".env" ]; then
    echo "⚙️ Создание файла конфигурации .env.production..."
    if [ ! -f ".env.production.example" ]; then
        echo "❌ Ошибка: .env.production.example не найден. Нельзя создавать конфигурацию с demo-секретами."
        exit 1
    fi
    cp .env.production.example .env.production

    # Generate random JWT secret if openssl or urandom is available
    if command -v openssl &> /dev/null; then
        RANDOM_JWT=$(openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | head -c 48)
        sed -i "s/GENERATE_RANDOM_SECRET_KEY_MINIMUM_32_CHARACTERS_HERE/$RANDOM_JWT/" .env.production 2>/dev/null || true
        
        RANDOM_DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
        sed -i "s/CHANGE_ME_TO_STRONG_COMPLEX_PASSWORD_64CHARS/$RANDOM_DB_PASS/g" .env.production 2>/dev/null || true
    fi
    echo "✅ Файл .env.production успешно сформирован."
fi

ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

# 4. Prepare required local directories
mkdir -p uploads docker/nginx/ssl

# 5. Start Containers in Offline Mode
echo "🚀 Запуск контейнеров EMS Platform в автономном режиме..."
COMPOSE_FILE="docker-compose.yml"
if [ ! -f "$COMPOSE_FILE" ] && [ -f "docker-compose.offline.yml" ]; then
    COMPOSE_FILE="docker-compose.offline.yml"
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

# 6. Health Check Loop
echo "⏳ Проверка состояния сервисов (Healthcheck)..."
sleep 5

MAX_RETRIES=30
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f http://127.0.0.1/healthz > /dev/null 2>&1 || curl -s -f http://127.0.0.1:3000/api/system/health > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Ожидание инициализации БД и запуска сервера ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 3
done

if [ "$HEALTHY" = true ]; then
    echo "======================================================================"
    echo "🎉 EMS Platform успешно запущена в автономном контуре!"
    echo "======================================================================"
    echo "🌐 Доступ к системе:"
    echo "   - Локально на ВМ:     http://localhost (или http://127.0.0.1:3000)"
    echo "   - Из локальной сети:  http://<IP-адрес-данной-ВМ>/"
    echo ""
    echo "👤 Первичный вход / Мастер настройки:"
    echo "   При первом входе откройте http://<IP-адрес-ВМ>/ и пройдите начальную"
    echo "   инициализацию для создания учетной записи Главного администратора."
    echo "======================================================================"
else
    echo "⚠️ Сервисы запущены, но статус готовности еще не подтвержден."
    echo "Для проверки журнала выполнения выполните команду:"
    echo "   docker compose -f $COMPOSE_FILE logs -f"
fi
