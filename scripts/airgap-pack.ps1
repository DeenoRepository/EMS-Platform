# ==============================================================================
# EMS Platform — Air-Gapped Packaging Script (Windows PowerShell)
# ==============================================================================
# Run this script on a machine WITH internet access to create an offline bundle
# that can be transferred to an isolated VM with ZERO internet connectivity.
# ==============================================================================
$ErrorActionPreference = "Stop"

$PackageDir = "ems-airgap-bundle"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ArchiveName = "ems-airgap-bundle-$Timestamp.zip"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "📦 EMS Platform — Подготовка пакета для автономного (Air-Gap) развертывания" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Ошибка: Docker не установлен или не запущен."
}

# 2. Build Web Application Image
Write-Host "🔨 Сборка Docker-образа приложения EMS Platform (ems-platform:latest)..." -ForegroundColor Yellow
docker build -t ems-platform:latest -f Dockerfile .

# 3. Pull Third-Party Base Images
Write-Host "⬇️ Загрузка базовых образов (PostgreSQL 16 Alpine, Nginx Alpine)..." -ForegroundColor Yellow
docker pull postgres:16-alpine
docker pull nginx:alpine

# 4. Clean & Prepare Package Directory
Write-Host "📁 Создание структуры каталога поставки ($PackageDir)..." -ForegroundColor Yellow
if (Test-Path $PackageDir) {
    Remove-Item -Path $PackageDir -Recurse -Force
}
New-Item -ItemType Directory -Path "$PackageDir\images" -Force | Out-Null
New-Item -ItemType Directory -Path "$PackageDir\docker\nginx\ssl" -Force | Out-Null
New-Item -ItemType Directory -Path "$PackageDir\scripts" -Force | Out-Null
New-Item -ItemType Directory -Path "$PackageDir\docs" -Force | Out-Null
New-Item -ItemType Directory -Path "$PackageDir\uploads" -Force | Out-Null

# 5. Export Docker Images to Tarball
Write-Host "💾 Экспорт Docker-образов в локальный архив (images\ems-images-bundle.tar)..." -ForegroundColor Yellow
docker save ems-platform:latest postgres:16-alpine nginx:alpine -o "$PackageDir\images\ems-images-bundle.tar"

# 6. Copy Configurations and Deployment Files
Write-Host "📄 Копирование конфигурационных файлов и скриптов..." -ForegroundColor Yellow
Copy-Item "docker-compose.offline.yml" "$PackageDir\docker-compose.yml"
Copy-Item "docker\nginx\nginx.conf" "$PackageDir\docker\nginx\nginx.conf"
Copy-Item ".env.production.example" "$PackageDir\.env.production.example"
Copy-Item "scripts\airgap-install.sh" "$PackageDir\install.sh"
Copy-Item "scripts\airgap-install.ps1" "$PackageDir\install.ps1"
Copy-Item "scripts\backup.sh" "$PackageDir\scripts\backup.sh"
Copy-Item "scripts\backup.ps1" "$PackageDir\scripts\backup.ps1"

if (Test-Path "docs\AIRGAP_OFFLINE_DEPLOYMENT.md") {
    Copy-Item "docs\AIRGAP_OFFLINE_DEPLOYMENT.md" "$PackageDir\docs\"
    Copy-Item "docs\AIRGAP_OFFLINE_DEPLOYMENT.md" "$PackageDir\README.md"
}

# 7. Create Final Transferable Zip
Write-Host "🗜️ Создание итогового дистрибутива: $ArchiveName..." -ForegroundColor Yellow
Compress-Archive -Path "$PackageDir\*" -DestinationPath $ArchiveName -Force

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "✅ Пакет для автономного развертывания успешно сформирован!" -ForegroundColor Green
Write-Host "📦 Архив: $ArchiveName" -ForegroundColor Green
Write-Host "📁 Каталог: $PackageDir\" -ForegroundColor Green
Write-Host ""
Write-Host "👉 Инструкция по переносу на закрытую ВМ:" -ForegroundColor Cyan
Write-Host "1. Скопируйте файл '$ArchiveName' на изолированную ВМ." -ForegroundColor White
Write-Host "2. Распакуйте архив на целевой ВМ и перейдите в папку." -ForegroundColor White
Write-Host "3. Запустите: .\install.ps1 (в Windows) или ./install.sh (в Linux)" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
