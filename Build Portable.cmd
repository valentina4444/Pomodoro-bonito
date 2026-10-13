@echo off
setlocal
title Pomodoro Cute - Build Portable
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts/app-tools.ps1" -Action build
echo.
pause
endlocal
