@echo off
chcp 65001 >nul
title Thien Duong Tinh Tam - Khoi Dong He Thong LIVE
cd /d "%~dp0"

echo ==================================================================
echo   KHOI DONG APP LIVE STREAM DI CHUA BAI PHAT (THIEN DUONG TINH TAM)
echo ==================================================================

if exist "ThienDuongControl.exe" (
    echo [1/2] Dang mo Bang Dieu Khien WinForms (ThienDuongControl.exe)...
    start "" "ThienDuongControl.exe"
) else (
    echo [1/2] Dang khoi dong Node Server...
    start "ThienDuongServer" cmd /k "cd /d "%~dp0server" && node server.js"
    timeout /t 2 >nul
    start "" "http://localhost:3000"
)

echo Hoan tat!
