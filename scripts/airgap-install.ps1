# ============================================================================
# EMS Platform — Air-Gapped Docker Installation (Windows PowerShell)
# ============================================================================
# Run from the extracted offline bundle on the isolated target machine.
# Requires Docker Engine and Docker Compose v2 already installed.
# ============================================================================
$ErrorActionPreference = "Stop"

$BundleDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BundleDir

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " EMS Platform — автономная установка в закрытом контуре (Air-Gap)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Не найдено обязательное приложение: $Name"
    }
}

Require-Command "docker"
try {
    docker compose version | Out-Null
} catch {
    throw "Docker Compose v2 не найден. Установите Docker Compose до запуска installer."
}

if (-not (Test-Path "images\ems-images-bundle.tar")) {
    throw "Архив образов images\ems-images-bundle.tar не найден в offline bundle."
}

Write-Host "Загрузка локальных Docker-образов..." -ForegroundColor Yellow
docker load --input "images\ems-images-bundle.tar"

$envFile = ".env.production"
if (-not (Test-Path $envFile)) {
    if (-not (Test-Path ".env.production.example")) {
        throw "Не найден .env.production.example для создания конфигурации."
    }
    Copy-Item ".env.production.example" $envFile
    Write-Host "Создан $envFile из шаблона. Проверьте секреты перед запуском." -ForegroundColor Yellow
}

New-Item -ItemType Directory -Path "uploads", "docker\nginx\ssl" -Force | Out-Null

Write-Host "Запуск offline compose-стека..." -ForegroundColor Yellow
docker compose --env-file $envFile -f "docker-compose.yml" up -d --remove-orphans

Write-Host "Ожидание готовности приложения..." -ForegroundColor Yellow
$maxRetries = 30
$healthy = $false
for ($retry = 1; $retry -le $maxRetries; $retry++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1/healthz" -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
            $healthy = $true
            break
        }
    } catch {
        # The service may still be booting; retry below.
    }
    Write-Host "  Ожидание запуска ($retry/$maxRetries)..."
    Start-Sleep -Seconds 3
}

if (-not $healthy) {
    Write-Warning "Контейнеры запущены, но health-check не подтвердился."
    Write-Host "Проверьте логи: docker compose -f docker-compose.yml logs -f" -ForegroundColor Yellow
    exit 1
}

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "EMS Platform успешно запущена в автономном Docker-контуре!" -ForegroundColor Green
Write-Host "Проверка логов: docker compose -f docker-compose.yml logs -f" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
