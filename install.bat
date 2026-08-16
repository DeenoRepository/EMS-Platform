@echo off
chcp 65001 > nul
title Установщик EMS Platform

echo ======================================================================
echo          EMS (Equipment Management System) - Установщик
echo ======================================================================
echo.

:: 1. Проверка Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не обнаружен!
    echo Пожалуйста, установите Node.js версии 18 или новее с https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js найден:
node -v
echo.

:: 2. Проверка / установка pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ИНФО] pnpm не найден. Выполняется автоматическая установка pnpm...
    call npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось установить pnpm.
        pause
        exit /b 1
    )
)

echo [OK] pnpm найден:
call pnpm -v
echo.

:: 3. Установка зависимостей
echo [1/4] Установка зависимостей проекта (pnpm install)...
call pnpm install
if %errorlevel% neq 0 (
    echo [ОШИБКА] Ошибка при установке зависимостей.
    pause
    exit /b 1
)
echo.

:: 4. Генерация Prisma Client
echo [2/4] Генерация клиента базы данных Prisma...
call pnpm --filter @ems/database generate
echo.

:: 5. Проверка наличия .env
if not exist ".env" (
    echo [3/4] Создание первичного файла конфигурации .env...
    if exist ".env.example" (
        copy .env.example .env > nul
    )
)
echo.

:: 6. Запуск веб-мастера настройки
echo [4/4] Запуск EMS Platform и веб-мастера настройки...
echo.
echo ======================================================================
echo  Приложение запускается на http://localhost:3000
echo  Для первоначальной настройки перейдите в веб-мастер:
echo  http://localhost:3000/setup
echo ======================================================================
echo.

start http://localhost:3000/setup
call pnpm dev

pause
