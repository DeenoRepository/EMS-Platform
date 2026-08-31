# ==============================================================================
# EMS Platform — Baremetal Offline Installation Script (Windows PowerShell)
# ==============================================================================
$ErrorActionPreference = "Stop"

$InstallDir = "C:\EMS-Platform"
$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🚀 EMS Platform — Автономная Baremetal установка на Windows (без Docker)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Node.js не найден в системе. Установите Node.js LTS перед запуском."
}

# 2. Copy files to target directory if needed
if ($CurrentDir -ne $InstallDir -and -not (Test-Path "$InstallDir\package.json")) {
    Write-Host "📁 Копирование файлов в $InstallDir..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Copy-Item "$CurrentDir\*" -Destination $InstallDir -Recurse -Force
}

Set-Location $InstallDir

# 3. Environment configuration
if (-not (Test-Path ".env.production")) {
    Write-Host "Создание .env.production..." -ForegroundColor Yellow
    if (-not (Test-Path ".env.production.example")) {
        throw ".env.production.example не найден. Нельзя создавать конфигурацию с demo-секретами."
    }
    Copy-Item ".env.production.example" ".env.production"
    Write-Host ".env.production создан из шаблона. Проверьте и замените все секреты перед запуском." -ForegroundColor Yellow
}

New-Item -ItemType Directory -Path "$InstallDir\uploads" -Force | Out-Null

# 4. Apply versioned database migrations (not db push --accept-data-loss):
# see plans/done/2026-08/L2-prisma-migration-baseline.md. On a pre-existing
# database created by an older db-push-based install, this fails with
# Prisma error P3005 instead of silently altering data; baseline it first
# per docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md.
Write-Host "🗄️ Применение миграций базы данных PostgreSQL..." -ForegroundColor Yellow
try {
    node node_modules\prisma\build\index.js migrate deploy --schema=packages\database\prisma\schema.prisma
    Write-Host "✅ Миграции БД применены." -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Не удалось применить миграции БД. Проверьте статус PostgreSQL службы и реквизиты в .env.production."
    Write-Warning "Если база данных существовала до этой версии, сначала выполните baseline из docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md."
}

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "🎉 EMS Platform готова к запуску!" -ForegroundColor Green
Write-Host "Для запуска выполните команду:" -ForegroundColor Yellow
Write-Host "   node node_modules\next\dist\bin\next start apps\web -p 3000" -ForegroundColor White
Write-Host "Или используйте NSSM для регистрации в качестве Windows Service:" -ForegroundColor Yellow
Write-Host "   nssm install EMS-Platform node `"$InstallDir\node_modules\next\dist\bin\next`" start apps\web -p 3000" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
