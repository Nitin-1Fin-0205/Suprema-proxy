@echo off
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
echo Starting Suprema Biometric Proxy directly...
echo.
echo ⚠️  WARNING: This will run in foreground mode
echo ⚠️  Keep this window open while the application runs
echo ⚠️  Close this window to stop the application
echo.
echo Starting in 3 seconds...
timeout /t 3 >nul
"%~dp0suprema-secure-proxy.exe"
pause
