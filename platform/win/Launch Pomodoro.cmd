@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts/app-tools.ps1" -Action launch
if errorlevel 1 pause
endlocal
