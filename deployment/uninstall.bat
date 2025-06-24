@echo off
REM Suprema Secure Proxy Uninstaller
REM This script removes the Suprema Secure Proxy service and files

echo.
echo ===================================
echo  Suprema Secure Proxy Uninstaller
echo ===================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This uninstaller must be run as Administrator.
    echo Please right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

set INSTALL_DIR=C:\Program Files\Suprema Secure Proxy
set SERVICE_NAME=SupremaSecureProxy

echo Checking for existing installation...

REM Check if service exists
sc query %SERVICE_NAME% >nul 2>&1
if %errorLevel% equ 0 (
    echo Stopping service...
    sc stop %SERVICE_NAME%
    timeout /t 5 /nobreak >nul
    
    echo Removing service...
    sc delete %SERVICE_NAME%
    if %errorLevel% equ 0 (
        echo Service removed successfully
    ) else (
        echo WARNING: Failed to remove service
    )
) else (
    echo Service not found, skipping service removal
)

REM Remove firewall rule
echo Removing firewall rule...
netsh advfirewall firewall delete rule name="Suprema Secure Proxy"

REM Remove SSL certificate
echo Removing SSL certificate...
if exist "%INSTALL_DIR%\localhost.crt" (
    certlm -delstore "Root" localhost
)

REM Remove installation directory
if exist "%INSTALL_DIR%" (
    echo Removing installation files...
    rmdir /s /q "%INSTALL_DIR%"
    if %errorLevel% equ 0 (
        echo Installation files removed successfully
    ) else (
        echo WARNING: Some files may not have been removed
        echo You may need to manually delete: %INSTALL_DIR%
    )
) else (
    echo Installation directory not found
)

echo.
echo ===================================
echo  Uninstallation Complete!
echo ===================================
echo.
echo The Suprema Secure Proxy has been removed from your system.
echo.
pause
