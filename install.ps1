# EMS Platform — PowerShell Установщик и Конфигуратор
# Encoding: UTF-8

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Установщик EMS Platform"

function Write-Header {
    Clear-Host
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "         EMS (Equipment Management System) — Установщик               " -ForegroundColor Yellow
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host ""
}

Write-Header

# 1. Проверка Node.js
Write-Host "[1/5] Проверка среды выполнения Node.js..." -ForegroundColor Cyan
try {
    $nodeVer = node -v
    Write-Host "  ✓ Node.js обнаружен: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js не найден в PATH!" -ForegroundColor Red
    Write-Host "  Установите Node.js версии 18+ с https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода..."
    exit 1
}

# 2. Проверка pnpm
Write-Host "`n[2/5] Проверка пакетного менеджера pnpm..." -ForegroundColor Cyan
try {
    $pnpmVer = pnpm -v
    Write-Host "  ✓ pnpm обнаружен: v$pnpmVer" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ pnpm не найден. Установка pnpm через npm..." -ForegroundColor Yellow
    npm install -g pnpm
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Не удалось установить pnpm!" -ForegroundColor Red
        Read-Host "Нажмите Enter для выхода..."
        exit 1
    }
}

# 3. Установка зависимостей
Write-Host "`n[3/5] Установка зависимостей монорепозитория (pnpm install)..." -ForegroundColor Cyan
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Ошибка при установке зависимостей!" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода..."
    exit 1
}
Write-Host "  ✓ Все зависимости успешно установлены" -ForegroundColor Green

# 4. Генерация Prisma Client
Write-Host "`n[4/5] Подготовка схемы и клиента базы данных (Prisma)..." -ForegroundColor Cyan
pnpm --filter @ems/database generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Ошибка генерации клиента базы данных!" -ForegroundColor Red
} else {
    Write-Host "  ✓ Prisma Client сгенерирован" -ForegroundColor Green
}

# 5. Выбор режима запуска
Write-Host "`n[5/5] Завершение подготовки." -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host " 1. Запустить веб-мастер первоначальной настройки (/setup в браузере)" -ForegroundColor White
Write-Host " 2. Запустить сервер в режиме разработки (pnpm dev)" -ForegroundColor White
Write-Host " 3. Собрать продакшн сборку (pnpm build)" -ForegroundColor White
Write-Host " 4. Выйти" -ForegroundColor Gray
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

$choice = Read-Host "Выберите действие [1-4] (по умолчанию: 1)"
if (-not $choice) { $choice = "1" }

switch ($choice) {
    "1" {
        Write-Host "`nЗапуск сервера и открытие мастера настройки..." -ForegroundColor Green
        Start-Process "http://localhost:3000/setup"
        pnpm dev
    }
    "2" {
        Write-Host "`nЗапуск сервера разработки..." -ForegroundColor Green
        pnpm dev
    }
    "3" {
        Write-Host "`nСборка production версии..." -ForegroundColor Green
        pnpm build
    }
    Default {
        Write-Host "`nГотово! Вы можете запустить EMS командой 'pnpm dev'." -ForegroundColor Green
    }
}
