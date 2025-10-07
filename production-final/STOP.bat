@echo off
echo ========================================
echo   SUPREMA BIOMETRIC PROXY - STOP
echo ========================================
echo.
echo Stopping Windows Service...
sc stop "SupremaProxy"
if errorlevel 1 (
    echo Service stop failed or service not running.
) else (
    echo Service stopped successfully.
)
echo.
echo Stopping any direct processes...
taskkill /F /IM "suprema-secure-proxy.exe" >nul 2>&1
if errorlevel 1 (
    echo No direct processes found.
) else (
    echo Direct processes terminated.
)
echo.
echo Checking final status...
timeout /t 2 >nul
sc query "SupremaProxy" | findstr "STATE" 2>nul
if errorlevel 1 (
    echo Service status: NOT INSTALLED
) else (
    echo Service status shown above
)
echo.
pause
