@echo off
setlocal enabledelayedexpansion
title BikeVault

cd /d "%~dp0"

set "NODE_DIR=C:\Program Files\nodejs"
set "PATH=%NODE_DIR%;%PATH%"

if not exist "%NODE_DIR%\node.exe" (
    echo [CHYBA] Node.js nebyl nalezen v %NODE_DIR%
    pause
    exit /b 1
)

echo ========================================================
echo   BikeVault - Kompletni historie tvych kol
echo ========================================================
echo.

if not exist "node_modules\" (
    echo [INFO] Instaluji knihovny...
    call "%NODE_DIR%\npm.cmd" install
    if errorlevel 1 (
        echo [CHYBA] Instalace selhala.
        pause
        exit /b 1
    )
)

if not exist ".next\" (
    echo [INFO] Vytvarim produkcni sestaveni...
    call "%NODE_DIR%\npm.cmd" run build
    if errorlevel 1 (
        echo [CHYBA] Sestaveni selhalo.
        pause
        exit /b 1
    )
)

echo [INFO] Spoustim server BikeVault na http://localhost:3000
echo [INFO] Oteviram prohlizec...
echo.
echo Pro ukonceni zavrete toto okno nebo stisknete Ctrl+C.
echo ========================================================
echo.

start "" http://localhost:3000

call "%NODE_DIR%\npm.cmd" run start -- -p 3000

if errorlevel 1 (
    echo [INFO] Spoustim v dev rezimu...
    call "%NODE_DIR%\npm.cmd" run dev -- -p 3000
)

pause
