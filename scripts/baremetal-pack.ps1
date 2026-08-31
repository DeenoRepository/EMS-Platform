# ==============================================================================
# EMS Platform — Baremetal Offline Packaging Script (Windows PowerShell)
# ==============================================================================
$ErrorActionPreference = "Stop"

$PackageDir = "ems-baremetal-bundle"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ArchiveName = "ems-baremetal-bundle-$Timestamp.zip"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "📦 EMS Platform — Сборка Baremetal пакета (без Docker)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Check Node & PNPM
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Node.js не найден."
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Error "❌ pnpm не найден."
}

# 2. Build Prisma & Next.js
Write-Host "⬇️ Проверка зависимостей и генерация Prisma..." -ForegroundColor Yellow
pnpm install --frozen-lockfile
pnpm --filter @ems/database generate

Write-Host "🏗️ Сборка Next.js..." -ForegroundColor Yellow
pnpm build

# 3. Clean Package Dir
Write-Host "📁 Подготовка каталога $PackageDir..." -ForegroundColor Yellow
if (Test-Path $PackageDir) {
    Remove-Item -Path $PackageDir -Recurse -Force
}
New-Item -ItemType Directory -Path "$PackageDir\apps\web" -Force | Out-Null
New-Item -ItemType Directory -Path "$PackageDir\packages" -Force | Out-Null
New-Item -ItemType Directory -Path "$PackageDir\scripts" -Force | Out-Null
New-Item -ItemType Directory -Path "$PackageDir\docs" -Force | Out-Null
New-Item -ItemType Directory -Path "$PackageDir\uploads" -Force | Out-Null

# 4. Copy Files
Write-Host "📄 Копирование файлов и скомпилированных артефактов..." -ForegroundColor Yellow
Copy-Item -Path "apps\web\.next" -Destination "$PackageDir\apps\web\.next" -Recurse
if (Test-Path "apps\web\public") {
    Copy-Item -Path "apps\web\public" -Destination "$PackageDir\apps\web\public" -Recurse
}
Copy-Item "apps\web\package.json" "$PackageDir\apps\web\package.json"
Copy-Item "apps\web\next.config.mjs" "$PackageDir\apps\web\next.config.mjs"

Copy-Item -Path "packages\auth" -Destination "$PackageDir\packages\auth" -Recurse
Copy-Item -Path "packages\database" -Destination "$PackageDir\packages\database" -Recurse
Copy-Item -Path "packages\shared" -Destination "$PackageDir\packages\shared" -Recurse

Copy-Item "package.json" "$PackageDir\package.json"
Copy-Item "pnpm-workspace.yaml" "$PackageDir\pnpm-workspace.yaml"
Copy-Item "pnpm-lock.yaml" "$PackageDir\pnpm-lock.yaml"
Copy-Item ".env.production.example" "$PackageDir\.env.production.example"

# node_modules
Write-Host "📦 Копирование зависимостей node_modules..." -ForegroundColor Yellow
Copy-Item -Path "node_modules" -Destination "$PackageDir\node_modules" -Recurse

# Scripts
Copy-Item "scripts\baremetal-install.sh" "$PackageDir\install.sh"
Copy-Item "scripts\baremetal-install.ps1" "$PackageDir\install.ps1"
Copy-Item "scripts\ems-platform.service" "$PackageDir\scripts\ems-platform.service"
Copy-Item "scripts\ems-baremetal.nginx.conf" "$PackageDir\scripts\ems-baremetal.nginx.conf"
Copy-Item "scripts\backup.sh" "$PackageDir\scripts\backup.sh"
Copy-Item "scripts\backup.ps1" "$PackageDir\scripts\backup.ps1"

if (Test-Path "docs\operations\BAREMETAL_OFFLINE_DEPLOYMENT.md") {
    Copy-Item "docs\operations\BAREMETAL_OFFLINE_DEPLOYMENT.md" "$PackageDir\docs\"
    Copy-Item "docs\operations\BAREMETAL_OFFLINE_DEPLOYMENT.md" "$PackageDir\README.md"
}

# 5. Compress
Write-Host "🗜️ Создание zip-архива $ArchiveName..." -ForegroundColor Yellow
Compress-Archive -Path "$PackageDir\*" -DestinationPath $ArchiveName -Force

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "✅ Архив $ArchiveName успешно сформирован!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
