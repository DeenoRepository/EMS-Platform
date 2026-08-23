<#
.SYNOPSIS
    EMS Platform — Production PostgreSQL Backup Utility for PowerShell
#>

$ErrorActionPreference = "Stop"

$backupDir = "backups\postgres"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "ems_backup_$timestamp.sql"

Write-Host "💾 Создание резервной копии базы данных EMS Platform..." -ForegroundColor Cyan

$container = "ems_postgres_prod"
$running = docker ps --format "{{.Names}}"
if ($running -notcontains $container) {
    $container = "ems_postgres"
}

if ($running -notcontains $container) {
    Write-Error "❌ Ошибка: Контейнер PostgreSQL ($container) не запущен."
    exit 1
}

docker exec -t $container pg_dumpall -c -U postgres | Out-File -FilePath $backupFile -Encoding utf8

$fileInfo = Get-Item $backupFile
$sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
Write-Host "✅ Резервная копия успешно создана: $backupFile ($sizeKB KB)" -ForegroundColor Green
