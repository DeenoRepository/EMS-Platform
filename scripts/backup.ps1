<#
.SYNOPSIS
    EMS Platform — Production Backup Utility for PowerShell (Database + Storage)

.DESCRIPTION
    Creates a PostgreSQL dump and (best-effort) an uploads/ archive, then
    applies a retention policy. Exits with a non-zero code if the database
    dump could not be created, so a Task Scheduler job correctly reports
    failure instead of silently succeeding. Retention only runs after a
    confirmed successful database dump.
#>

param(
    [string]$BackupDir = ".\backups",
    [string]$StorageDir = ".\uploads",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "💾 EMS Platform — Запуск создания резервной копии ($timestamp)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. PostgreSQL Database Dump
$dbBackupFile = Join-Path $BackupDir "ems_database_$timestamp.sql"
Write-Host "📦 [1/2] Создание дампа базы данных PostgreSQL..." -ForegroundColor Yellow

$container = "ems_postgres_prod"
$running = docker ps --format "{{.Names}}" 2>$null
if ($running -notcontains $container) {
    $container = "ems_postgres"
}

$dbBackupOk = $false
if ($running -contains $container) {
    docker exec -t $container pg_dumpall -c -U postgres | Out-File -FilePath $dbBackupFile -Encoding utf8
    if ($LASTEXITCODE -eq 0 -and (Test-Path $dbBackupFile) -and (Get-Item $dbBackupFile).Length -gt 0) {
        $dbBackupOk = $true
    }
} else {
    Write-Warning "Контейнер PostgreSQL ($container) не запущен."
}

if ($dbBackupOk) {
    $fileInfo = Get-Item $dbBackupFile
    $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
    Write-Host "  -> Дамп БД успешно создан из контейнера $container`: $dbBackupFile ($sizeKB KB)" -ForegroundColor Green
} else {
    Write-Error "Не удалось создать дамп базы данных PostgreSQL. Резервное копирование ПРЕРВАНО. Ретенция не выполняется."
    if (Test-Path $dbBackupFile) { Remove-Item $dbBackupFile -Force -ErrorAction SilentlyContinue }
    exit 1
}

# 2. File Storage Archive (best-effort)
if ((Test-Path $StorageDir) -and (Get-ChildItem $StorageDir)) {
    $storageZipFile = Join-Path $BackupDir "ems_storage_$timestamp.zip"
    Write-Host "📁 [2/2] Архивация каталога файлов и чертежей ($StorageDir)..." -ForegroundColor Yellow
    Compress-Archive -Path "$StorageDir\*" -DestinationPath $storageZipFile -Force
    $zipInfo = Get-Item $storageZipFile
    $zipKB = [math]::Round($zipInfo.Length / 1KB, 2)
    Write-Host "  -> Архив хранилища создан: $storageZipFile ($zipKB KB)" -ForegroundColor Green
} else {
    Write-Host "📁 [2/2] Каталог $StorageDir пуст или отсутствует. Пропуск." -ForegroundColor DarkGray
}

# 3. Retention policy — only reached if the database dump above succeeded.
Write-Host "🧹 Очистка резервных копий старше $RetentionDays дней..." -ForegroundColor Yellow
$limit = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "ems_database_*.sql" | Where-Object { $_.CreationTime -lt $limit } | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $BackupDir -Filter "ems_storage_*.zip" | Where-Object { $_.CreationTime -lt $limit } | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "✅ Резервное копирование EMS Platform успешно завершено!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
