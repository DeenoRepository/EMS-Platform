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
    Write-Host "⚙️ Создание .env.production..." -ForegroundColor Yellow
    if (Test-Path ".env.production.example") {
        Copy-Item ".env.production.example" ".env.production"
    } else {
        @"
DATABASE_URL="postgresql://postgres:postgres_secure_password@localhost:5432/ems_db?schema=public"
JWT_SECRET="super_secret_jwt_key_ems_platform_production_change_me_32chars"
PORT=3000
NODE_ENV=production
UPLOAD_DIR="$InstallDir\uploads"
"@ | Out-File -FilePath ".env.production" -Encoding utf8
    }
}

New-Item -ItemType Directory -Path "$InstallDir\uploads" -Force | Out-Null

# 4. Database provisioning is deliberately separate from application installation.
# Never mutate an existing database as a side effect of installing application files.
Write-Warning "Схема БД этим скриптом не изменяется. Для новой установки отдельно подготовьте БД по согласованной процедуре."
Write-Warning "До запуска проверьте конфигурацию и совместимость существующей схемы с версией приложения."

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "Файлы подготовлены. Готовность БД и приложения к запуску еще требует проверки." -ForegroundColor Yellow
Write-Host "Для запуска выполните команду:" -ForegroundColor Yellow
Write-Host "   node node_modules\next\dist\bin\next start apps\web -p 3000" -ForegroundColor White
Write-Host "Или используйте NSSM для регистрации в качестве Windows Service:" -ForegroundColor Yellow
Write-Host "   nssm install EMS-Platform node `"$InstallDir\node_modules\next\dist\bin\next`" start apps\web -p 3000" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
