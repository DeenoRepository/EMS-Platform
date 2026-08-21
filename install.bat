@echo off
chcp 65001 > nul
title Установщик EMS Platform (Production)

echo ======================================================================
echo          EMS (Equipment Management System) - Установщик
echo ======================================================================
echo.

:: 1. Проверка .env
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env > nul
        echo [OK] Создан файл .env из шаблона .env.example
    )
)

echo Выберите сценарий развертывания EMS Platform:
echo ----------------------------------------------------------------------
echo  1. [Рекомендуется] Запустить Production стек в Docker (Postgres + OpenLDAP + Web)
echo  2. Собрать и запустить локальный Production билд (pnpm build ^&^& pnpm start)
echo  3. Запустить режим разработки (pnpm dev)
echo  4. Запустить тесты (pnpm test)
echo  5. Выход
echo ----------------------------------------------------------------------

set /p choice="Выберите вариант [1-5] (по умолчанию: 1): "
if "%choice%"=="" set choice=1

if "%choice%"=="1" (
    echo.
    echo Запуск Production стека через Docker Compose...
    docker compose up -d --build
    echo.
    echo Открытие мастера настройки в браузере...
    start http://localhost:3000/setup
    pause
    exit /b 0
)

if "%choice%"=="2" (
    echo.
    echo Локальная сборка и запуск...
    call pnpm --filter @ems/database generate
    call pnpm build
    start http://localhost:3000/setup
    call pnpm --filter @ems/web start
    pause
    exit /b 0
)

if "%choice%"=="3" (
    echo.
    echo Запуск в режиме разработки...
    call pnpm --filter @ems/database generate
    start http://localhost:3000/setup
    call pnpm dev
    pause
    exit /b 0
)

if "%choice%"=="4" (
    echo.
    echo Запуск тестов...
    call pnpm test
    pause
    exit /b 0
)

echo Выход.
