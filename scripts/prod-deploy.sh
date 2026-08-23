#!/bin/bash
# ==============================================================================
# EMS Platform — Production Zero-Downtime Deployment Script (Linux/Unix)
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo "🚀 EMS Platform — Запуск автоматического развертывания в Production"
echo "======================================================================"

# 1. Check Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Ошибка: Docker не установлен на целевом сервере."
    exit 1
fi

# 2. Check production environment file
if [ ! -f ".env.production" ] && [ ! -f ".env" ]; then
    echo "⚠️ Файл .env.production не найден. Создание из шаблона .env.production.example..."
    cp .env.production.example .env.production
    
    # Generate random JWT secret if not set
    RANDOM_JWT=$(openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | head -c 48)
    sed -i "s/GENERATE_RANDOM_SECRET_KEY_MINIMUM_32_CHARACTERS_HERE/$RANDOM_JWT/" .env.production
    
    RANDOM_DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    sed -i "s/CHANGE_ME_TO_STRONG_COMPLEX_PASSWORD_64CHARS/$RANDOM_DB_PASS/g" .env.production
    echo "✅ Файл .env.production сформирован с безопасными сгенерированными ключами."
fi

ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

# 3. Create required directories
mkdir -p uploads docker/nginx/ssl

# 4. Pull/Build and Start containers
echo "📦 Сборка и запуск контейнеров в Production режиме..."
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --build --remove-orphans

# 5. Wait for database and application health
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
    echo "Ожидание готовности платформы ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 3
done

if [ "$HEALTHY" = true ]; then
    echo "======================================================================"
    echo "🎉 EMS Platform успешно развернута и готова к работе в Production!"
    echo "👉 Доступ через Web: http://localhost или https://ваш-домен"
    echo "======================================================================"
else
    echo "⚠️ Сервер запущен, но статус здоровья еще не ответил. Проверьте логи:"
    echo "   docker compose -f docker-compose.prod.yml logs -f"
fi
