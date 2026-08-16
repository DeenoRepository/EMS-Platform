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

# 1. Проверка Node.js
echo -e "${CYAN}[1/5] Проверка Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ОШИБКА] Node.js не найден! Установите Node.js v18+ (https://nodejs.org/)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) обнаружен${NC}"

# 2. Проверка pnpm
echo -e "\n${CYAN}[2/5] Проверка pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm не найден. Установка pnpm...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v) обнаружен${NC}"

# 3. Установка зависимостей
echo -e "\n${CYAN}[3/5] Установка зависимостей (pnpm install)...${NC}"
pnpm install
echo -e "${GREEN}✓ Зависимости установлены${NC}"

# 4. Генерация Prisma
echo -e "\n${CYAN}[4/5] Генерация Prisma Client...${NC}"
pnpm --filter @ems/database generate
echo -e "${GREEN}✓ Клиент БД сгенерирован${NC}"

# 5. Создание .env при отсутствии
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Создан .env из шаблона .env.example${NC}"
    fi
fi

echo -e "\n${CYAN}======================================================================${NC}"
echo -e "${GREEN} Установка завершена!${NC}"
echo -e " Для первичной настройки перейдите в веб-мастер:"
echo -e " ${YELLOW}http://localhost:3000/setup${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo ""

# Запуск приложения
pnpm dev
