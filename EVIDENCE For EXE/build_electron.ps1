# Automation Build & Sync Script for Standalone Electron App
# Verifies pathways, builds Vite project with relative assets, and synchronizes resources.

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "⚙️  BUILDING DIGITAL EVIDENCE DESKTOP APP...  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Compile the React + Vite frontend
Write-Host "`n1. Compiling React frontend with relative asset paths..." -ForegroundColor Yellow
Push-Location "..\Create Single Page Website"
try {
    npm run build
} finally {
    Pop-Location
}

# 2. Synchronize built files
Write-Host "`n2. Synchronizing static dist resources to Electron workspace..." -ForegroundColor Yellow
$DestDist = ".\dist"
if (Test-Path $DestDist) {
    Remove-Item -Recurse -Force $DestDist
}

Copy-Item -Recurse -Force "..\Create Single Page Website\dist" $DestDist

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "✅ SYNC COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "To launch the app:      npm start" -ForegroundColor Green
Write-Host "To package portable exe: npm run dist" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
