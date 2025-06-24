@echo off
REM Suprema Secure Proxy Installer
REM This script installs the Suprema Secure Proxy as a Windows service

echo.
echo ===================================
echo  Suprema Secure Proxy Installer
echo ===================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This installer must be run as Administrator.
    echo Please right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Checking system requirements...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js found: 
node --version

REM Set installation directory
set INSTALL_DIR=C:\Program Files\Suprema Secure Proxy
set SERVICE_NAME=SupremaSecureProxy

echo.
echo Installation directory: %INSTALL_DIR%

REM Create installation directory
if not exist "%INSTALL_DIR%" (
    echo Creating installation directory...
    mkdir "%INSTALL_DIR%"
    if %errorLevel% neq 0 (
        echo ERROR: Failed to create installation directory
        pause
        exit /b 1
    )
)

REM Copy files
echo Copying application files...
copy /Y "suprema-secure-proxy.exe" "%INSTALL_DIR%\"
copy /Y "localhost.crt" "%INSTALL_DIR%\"
copy /Y "localhost.key" "%INSTALL_DIR%\"

if not exist "%INSTALL_DIR%\logs" mkdir "%INSTALL_DIR%\logs"

REM Install and trust the SSL certificate
echo Installing SSL certificate...
certlm -addstore -f "Root" "%INSTALL_DIR%\localhost.crt"
if %errorLevel% neq 0 (
    echo WARNING: Failed to install SSL certificate automatically
    echo You may need to manually trust the certificate
)

REM Install the service using Node.js service wrapper
echo Installing Windows service...

REM Create service wrapper script
echo const { Service } = require('node-windows'); > "%INSTALL_DIR%\service-install.js"
echo const path = require('path'); >> "%INSTALL_DIR%\service-install.js"
echo. >> "%INSTALL_DIR%\service-install.js"
echo const svc = new Service({ >> "%INSTALL_DIR%\service-install.js"
echo   name: '%SERVICE_NAME%', >> "%INSTALL_DIR%\service-install.js"
echo   description: 'Suprema Secure Proxy Service', >> "%INSTALL_DIR%\service-install.js"
echo   script: path.join(__dirname, 'suprema-secure-proxy.exe'), >> "%INSTALL_DIR%\service-install.js"
echo   nodeOptions: [] >> "%INSTALL_DIR%\service-install.js"
echo }^); >> "%INSTALL_DIR%\service-install.js"
echo. >> "%INSTALL_DIR%\service-install.js"
echo svc.on('install', function(^){ >> "%INSTALL_DIR%\service-install.js"
echo   console.log('Service installed successfully'); >> "%INSTALL_DIR%\service-install.js"
echo   svc.start(^); >> "%INSTALL_DIR%\service-install.js"
echo }^); >> "%INSTALL_DIR%\service-install.js"
echo. >> "%INSTALL_DIR%\service-install.js"
echo svc.install(^); >> "%INSTALL_DIR%\service-install.js"

REM Install node-windows if not present
cd /d "%INSTALL_DIR%"
npm list node-windows >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing service dependencies...
    npm install node-windows
)

REM Run service installation
node service-install.js

REM Clean up temporary file
del service-install.js

REM Add firewall rule
echo Adding firewall rule...
netsh advfirewall firewall add rule name="Suprema Secure Proxy" dir=in action=allow protocol=TCP localport=3443

echo.
echo ===================================
echo  Installation Complete!
echo ===================================
echo.
echo Service: %SERVICE_NAME%
echo Port: 3443 (HTTPS)
echo Installation: %INSTALL_DIR%
echo.
echo The service should now be running.
echo You can check the status using: sc query %SERVICE_NAME%
echo.
echo To test the proxy, visit: https://localhost:3443/health
echo.
pause
