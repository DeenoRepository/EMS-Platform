<#
.SYNOPSIS
    EMS Platform — Production Deployment Script for Windows Server / PowerShell
#>

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🚀 EMS Platform — Запуск автоматического развертывания в Production" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Verify Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Ошибка: Docker не установлен или недоступен в PATH."
    exit 1
}

# 2. Check environment file
$envFile = ".env.production"
if (-not (Test-Path $envFile)) {
    if (Test-Path ".env") {
        $envFile = ".env"
    } else {
        Write-Host "⚠️ Создание .env.production из шаблона..." -ForegroundColor Yellow
        Copy-Item ".env.production.example" ".env.production"
        
        $jwtBytes = New-Object byte[] 32
        (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($jwtBytes)
        $jwtSecret = [Convert]::ToBase64String($jwtBytes) -replace '[^a-zA-Z0-9]', ''
        
        $dbPassBytes = New-Object byte[] 24
        (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($dbPassBytes)
        $dbPass = [Convert]::ToBase64String($dbPassBytes) -replace '[^a-zA-Z0-9]', ''
        
        (Get-Content ".env.production") `
            -replace "GENERATE_RANDOM_SECRET_KEY_MINIMUM_32_CHARACTERS_HERE", $jwtSecret `
            -replace "CHANGE_ME_TO_STRONG_COMPLEX_PASSWORD_64CHARS", $dbPass |
            Set-Content ".env.production"
            
        Write-Host "✅ Файл .env.production успешно сформирован с новыми ключами." -ForegroundColor Green
    }
}

# 3. Ensure directories exist
New-Item -ItemType Directory -Force -Path "uploads", "docker/nginx/ssl" | Out-Null

# 4. Build and run compose stack
Write-Host "📦 Сборка и запуск контейнеров в Production режиме..." -ForegroundColor Cyan
docker compose --env-file $envFile -f docker-compose.prod.yml up -d --build --remove-orphans

Write-Host "⏳ Проверка состояния сервисов..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxRetries = 30
$retryCount = 0
$healthy = $false

while ($retryCount -lt $maxRetries) {
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/system/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {}
    $retryCount++
    Write-Host "Ожидание готовности платформы ($retryCount/$maxRetries)..."
    Start-Sleep -Seconds 3
}

if ($healthy) {
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "🎉 EMS Platform успешно развернута и готова к работе в Production!" -ForegroundColor Green
    Write-Host "👉 Доступ через Web: http://localhost:3000 или http://localhost (через Nginx)" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
} else {
    Write-Host "⚠️ Контейнеры запущены. Для просмотра логов выполните: docker compose -f docker-compose.prod.yml logs -f" -ForegroundColor Yellow
}
