@echo off
title DelugeRPG Standalone Stealth Client
taskkill /f /im electron.exe >nul 2>&1
ping -n 2 127.0.0.1 >nul 2>&1
cd /d "%~dp0desktop-client"
echo Starting DelugeRPG Standalone Stealth Desktop Client...
set "ELECTRON_RUN_AS_NODE="
start "" "C:\Users\User\AppData\Roaming\npm\node_modules\electron\dist\electron.exe" .
