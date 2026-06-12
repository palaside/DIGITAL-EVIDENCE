@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo DIGITAL EVIDENCE PROCESSOR
echo ========================================
if not exist inputs mkdir inputs
if not exist outputs mkdir outputs
if not exist logs mkdir logs
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo Starting Electron...
npm start
echo Done. Check outputs folder.
pause
