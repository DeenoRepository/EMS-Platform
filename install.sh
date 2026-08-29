#!/usr/bin/env bash
# EMS Platform — Linux/macOS Automated Installer
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================================${NC}"
echo -e "${YELLOW}         EMS (Equipment Management System) — Установщик               ${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo ""

# 1. Проверка .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Создан .env из шаблона .env.example${NC}"
    fi
fi

echo -e "${CYAN}Выберите сценарий развертывания EMS Platform:${NC}"
echo "----------------------------------------------------------------------"
echo " 1. [Рекомендуется] Запустить Production стек в Docker (Postgres + OpenLDAP + Web)"
echo " 2. Собрать и запустить локальный Production билд (pnpm build && pnpm start)"
echo " 3. Запустить режим разработки (pnpm dev)"
echo " 4. Запустить тесты (pnpm test)"
echo " 5. Выход"
echo "----------------------------------------------------------------------"

read -p "Выберите вариант [1-5] (по умолчанию: 1): " choice
choice=${choice:-1}

case $choice in
    1)
        echo -e "\n${GREEN}Сборка и запуск локального dev-стека через Docker Compose...${NC}"
        docker compose up -d --build
        echo -e "\n${GREEN}✓ Контейнеры запущены! Откройте в браузере: http://localhost:3000/setup${NC}"
        ;;
    2)
        echo -e "\n${GREEN}Локальная сборка и запуск Production...${NC}"
        pnpm --filter @ems/database generate
        pnpm build
        pnpm --filter @ems/web start
        ;;
    3)
        echo -e "\n${GREEN}Запуск сервера разработки...${NC}"
        pnpm --filter @ems/database generate
        pnpm dev
        ;;
    4)
        echo -e "\n${GREEN}Запуск тестов...${NC}"
        pnpm test
        ;;
    *)
        echo -e "\nВыход."
        ;;
esac
