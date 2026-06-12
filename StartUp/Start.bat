@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo STARTUP PROJECT GENERATOR RUNTIME
echo INPUT ^> ANALYZE ^> CLASSIFY ^> GENERATE FILES ^> GENERATE PROJECT ^> INSTALL DEPENDENCIES ^> BUILD ^> START
echo ========================================
node startup-runtime.js
