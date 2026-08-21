# EMS Platform — PowerShell Установщик и Конфигуратор
# Encoding: UTF-8

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Установщик EMS Platform (Production & Setup Wizard)"

function Write-Header {
    Clear-Host
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "         EMS (Equipment Management System) — Установщик               " -ForegroundColor Yellow
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host ""
}

Write-Header

# 1. Проверка окружения
Write-Host "[1/4] Проверка среды выполнения..." -ForegroundColor Cyan

$dockerAvailable = $false
try {
    $dockerVer = docker --version
    Write-Host "  ✓ Docker обнаружен: $dockerVer" -ForegroundColor Green
    $dockerAvailable = $true
} catch {
    Write-Host "  ⚠ Docker не обнаружен в PATH (для Docker Compose потребуется установка Docker Desktop)" -ForegroundColor Yellow
}

try {
    $nodeVer = node -v
    Write-Host "  ✓ Node.js обнаружен: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Node.js не найден в PATH!" -ForegroundColor Yellow
}

# 2. Проверка конфигурационного файла
Write-Host "`n[2/4] Проверка конфигурации .env..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "  ✓ Создан .env из шаблона .env.example" -ForegroundColor Green
    }
} else {
    Write-Host "  ✓ Файл .env существует" -ForegroundColor Green
}

# 3. Выбор сценария запуска
Write-Host "`n[3/4] Выбор сценария развертывания EMS Platform:" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host " 1. [Рекомендуется] Запустить Production стек в Docker (Postgres + OpenLDAP + Web)" -ForegroundColor White
Write-Host " 2. Запустить локальный Production билд (pnpm build && pnpm start)" -ForegroundColor White
Write-Host " 3. Запустить режим разработки (pnpm dev)" -ForegroundColor White
Write-Host " 4. Запустить диагностические тесты (pnpm test)" -ForegroundColor White
Write-Host " 5. Выйти" -ForegroundColor Gray
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

$choice = Read-Host "Выберите вариант [1-5] (по умолчанию: 1)"
if (-not $choice) { $choice = "1" }

switch ($choice) {
    "1" {
        Write-Host "`n[4/4] Сборка и запуск Production стека через Docker Compose..." -ForegroundColor Green
        docker compose up -d --build
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✓ Все контейнеры успешно запущены!" -ForegroundColor Green
            Write-Host "  - EMS Web:      http://localhost:3000" -ForegroundColor Cyan
            Write-Host "  - Мастер setup: http://localhost:3000/setup" -ForegroundColor Cyan
            Write-Host "  - PostgreSQL:   localhost:5432" -ForegroundColor Cyan
            Write-Host "  - OpenLDAP:     localhost:1389" -ForegroundColor Cyan
            Write-Host "`nОткрытие веб-мастера настройки в браузере..." -ForegroundColor Yellow
            Start-Process "http://localhost:3000/setup"
        } else {
            Write-Host "`n✗ Ошибка запуска Docker Compose!" -ForegroundColor Red
        }
    }
    "2" {
        Write-Host "`n[4/4] Локальная сборка и запуск Production..." -ForegroundColor Green
        pnpm --filter @ems/database generate
        pnpm build
        Start-Process "http://localhost:3000/setup"
        pnpm --filter @ems/web start
    }
    "3" {
        Write-Host "`n[4/4] Запуск сервера разработки..." -ForegroundColor Green
        pnpm --filter @ems/database generate
        Start-Process "http://localhost:3000/setup"
        pnpm dev
    }
    "4" {
        Write-Host "`n[4/4] Запуск тестов безопасности и доменной логики..." -ForegroundColor Green
        pnpm test
    }
    Default {
        Write-Host "`nВыход из программы установки." -ForegroundColor Green
    }
}
