@echo off
chcp 65001 >nul
set TARGET=D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE\StartUp
if not exist "%TARGET%" mkdir "%TARGET%"
xcopy "%~dp0*" "%TARGET%\" /E /I /Y
explorer "%TARGET%"
echo Installed to %TARGET%
pause
