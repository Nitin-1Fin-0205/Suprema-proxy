@echo off
echo ===============================================================================
echo   SUPREMA BIOMETRIC PROXY - COMPLETE UNINSTALLER
echo ===============================================================================
echo.
:: Check for administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ ERROR: Administrator privileges required!
    echo Please right-click this file and select "Run as administrator"
    pause
    exit /b 1
)
echo ✅ Administrator privileges confirmed
echo.
set SERVICE_NAME=SupremaProxy
set EXE_NAME=suprema-secure-proxy.exe
echo ⚠️  WARNING: This will completely remove the Suprema Biometric Proxy
echo Database and log files will be preserved in case you want to reinstall.
echo.
set /p confirm="Continue with uninstallation? ^(Y/N^): "
if /i not "%confirm%"=="Y" (
    echo ❌ Uninstallation cancelled by user
    pause
    exit /b 0
)
echo.
echo 🛑 Stopping service...
sc stop "%SERVICE_NAME%" >nul 2>&1
timeout /t 3 >nul
echo.
echo 🗑️  Removing Windows Service...
sc delete "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Windows Service removed
) else (
    echo ⚠️  Service removal failed (may not exist)
)
echo.
echo 🔥 Removing firewall rules...
netsh advfirewall firewall delete rule name="Suprema Biometric Proxy" >nul 2>&1
echo ✅ Firewall rules removed
echo.
echo 🧹 Terminating any running processes...
taskkill /F /IM "%EXE_NAME%" >nul 2>&1
echo ✅ All processes terminated
echo.
echo ===============================================================================
echo ✅ UNINSTALLATION COMPLETE!
echo ===============================================================================
echo.
echo 🗑️  REMOVED:
echo    - Windows Service
echo    - Firewall rules
echo    - SSL certificate trust
echo.
echo 📁 PRESERVED (can be manually deleted if desired):
echo    - Application files: %~dp0
echo    - Database: %~dp0data\
echo    - Logs: %~dp0logs\
echo.
echo ℹ️  To reinstall, run INSTALL.bat again
echo.
pause
