@echo off
title DelugeRPG Standalone Stealth Client
taskkill /f /im electron.exe >nul 2>&1
ping -n 2 127.0.0.1 >nul 2>&1
set "ELECTRON_RUN_AS_NODE="
cd /d "%~dp0"
start "" "C:\Users\User\AppData\Roaming\npm\node_modules\electron\dist\electron.exe" .
