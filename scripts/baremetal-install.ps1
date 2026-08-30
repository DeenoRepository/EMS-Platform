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

# 4. Database schema push
Write-Host "🗄️ Синхронизация схемы базы данных PostgreSQL..." -ForegroundColor Yellow
try {
    node node_modules\prisma\build\index.js db push --schema=packages\database\prisma\schema.prisma --accept-data-loss
    Write-Host "✅ Схема БД синхронизирована." -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Не удалось выполнить db push. Проверьте статус PostgreSQL службы и реквизиты в .env.production."
}

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "🎉 EMS Platform готова к запуску!" -ForegroundColor Green
Write-Host "Для запуска выполните команду:" -ForegroundColor Yellow
Write-Host "   node node_modules\next\dist\bin\next start apps\web -p 3000" -ForegroundColor White
Write-Host "Или используйте NSSM для регистрации в качестве Windows Service:" -ForegroundColor Yellow
Write-Host "   nssm install EMS-Platform node `"$InstallDir\node_modules\next\dist\bin\next`" start apps\web -p 3000" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
