# ==============================================================================
# EMS-Platform: Production Database & Storage Backup Script (PowerShell)
# ==============================================================================
param(
    [string]$BackupDir = ".\backups",
    [string]$StorageDir = ".\uploads",
    [string]$DbName = "ems_db",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "[EMS BACKUP] Starting full backup at $(Get-Date)" -ForegroundColor Cyan
Write-Host "[EMS BACKUP] Output directory: $BackupDir" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. PostgreSQL Database Dump
$dbBackupFile = Join-Path $BackupDir "ems_db_$timestamp.sql"
Write-Host "[1/2] Creating PostgreSQL database dump..." -ForegroundColor Yellow
try {
    & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName --clean --if-exists -f $dbBackupFile
    Write-Host "  -> Database dump created: $dbBackupFile" -ForegroundColor Green
} catch {
    Write-Warning "pg_dump failed or is not in PATH. Ensure PostgreSQL client tools are installed."
}

# 2. File Storage Archive
if (Test-Path $StorageDir) {
    $storageZipFile = Join-Path $BackupDir "ems_storage_$timestamp.zip"
    Write-Host "[2/2] Archiving local documents and photos storage..." -ForegroundColor Yellow
    Compress-Archive -Path "$StorageDir\*" -DestinationPath $storageZipFile -Force
    Write-Host "  -> Storage archive created: $storageZipFile" -ForegroundColor Green
} else {
    Write-Host "[2/2] Storage directory not found at $StorageDir, skipping." -ForegroundColor DarkGray
}

# 3. Retention policy: remove backups older than $RetentionDays days
Write-Host "[CLEANUP] Removing backups older than $RetentionDays days..." -ForegroundColor Yellow
$limit = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "ems_db_*.sql" | Where-Object { $_.CreationTime -lt $limit } | Remove-Item -Force
Get-ChildItem -Path $BackupDir -Filter "ems_storage_*.zip" | Where-Object { $_.CreationTime -lt $limit } | Remove-Item -Force

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "[EMS BACKUP] Backup successfully completed at $(Get-Date)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
