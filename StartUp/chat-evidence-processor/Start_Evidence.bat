@echo off
title Chat Evidence Processor Launcher
cd /d "%~dp0"

echo ===================================================
echo   Starting Chat Evidence Processor...
echo ===================================================

:: Check and create folders if missing
if not exist "inputs" (
    echo Creating inputs folder...
    mkdir "inputs"
)
if not exist "outputs" (
    echo Creating outputs folder...
    mkdir "outputs"
)

:: Check for node_modules
if not exist "node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies. Please ensure Node.js/npm is installed and try again.
        pause
        exit /b 1
    )
)

echo Launching Electron application...
call npx electron .
if errorlevel 1 (
    echo Electron application closed with an error code.
) else (
    echo Application closed successfully.
)

pause
