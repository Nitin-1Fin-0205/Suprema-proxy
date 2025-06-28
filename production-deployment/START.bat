@echo off
:MENU
echo ========================================
echo   SUPREMA BIOMETRIC PROXY STARTUP
echo ========================================
echo.
echo 1. Start as Windows Service (recommended, background)
echo 2. Run EXE directly (debug/foreground)
echo 3. Exit
echo.
set /p choice="Select an option [1-3]: "
if "%choice%"=="1" goto SERVICE
if "%choice%"=="2" goto DIRECT
if "%choice%"=="3" exit /b

echo Invalid choice.
goto MENU

:SERVICE
echo Starting Suprema Biometric Proxy Service...
sc start "SupremaProxy"
if errorlevel 1 (
    echo Failed to start service. Please check logs or reinstall the service.
    echo Service NOT started.
) else (
    echo Service started successfully!
)
echo.
echo Checking status...
timeout /t 3 >nul
sc query "SupremaProxy" | findstr "STATE"
echo.
echo Health check: https://localhost:4000/health
pause
exit /b

:DIRECT
echo Running suprema-secure-proxy.exe directly (window will be visible)...
start "SupremaProxy" "%~dp0suprema-secure-proxy.exe"
echo.
echo Press any key to return to menu.
pause >nul
goto MENU

