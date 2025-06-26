@echo off
title Suprema Secure Proxy - Installation
setlocal enabledelayedexpansion

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

echo Running with Administrator privileges...
echo.

REM Set installation directory and current directory
set "INSTALL_DIR=C:\Program Files\Suprema Secure Proxy"
set "CURRENT_DIR=%~dp0"
set SERVICE_NAME=SupremaSecureProxy

echo Installation directory: %INSTALL_DIR%
echo Current directory: %CURRENT_DIR%
echo.

echo Checking for required files...
if not exist "%CURRENT_DIR%suprema-secure-proxy.exe" (
    echo ERROR: suprema-secure-proxy.exe not found in current directory
    echo Please ensure all files are extracted from the ZIP package
    pause
    exit /b 1
)

if not exist "%CURRENT_DIR%certs" (
    echo ERROR: certs folder not found in current directory  
    echo Please ensure all files are extracted from the ZIP package
    pause
    exit /b 1
)

if not exist "%CURRENT_DIR%certs\localhost.crt" (
    echo ERROR: SSL certificate not found in certs folder
    pause
    exit /b 1
)

echo All required files found.

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
copy /Y "%CURRENT_DIR%suprema-secure-proxy.exe" "%INSTALL_DIR%\"
if %errorLevel% neq 0 (
    echo ERROR: Failed to copy application file
    pause
    exit /b 1
)

if not exist "%INSTALL_DIR%\certs" mkdir "%INSTALL_DIR%\certs"
copy /Y "%CURRENT_DIR%certs\localhost.crt" "%INSTALL_DIR%\certs\"
copy /Y "%CURRENT_DIR%certs\localhost.key" "%INSTALL_DIR%\certs\"
if %errorLevel% neq 0 (
    echo ERROR: Failed to copy certificate files
    pause
    exit /b 1
)

if not exist "%INSTALL_DIR%\logs" mkdir "%INSTALL_DIR%\logs"

echo Files copied successfully.

REM Install and trust the SSL certificate
echo Installing SSL certificate...
echo This may take a moment...

REM First try PowerShell method
powershell -Command "try { $cert = Import-Certificate -FilePath '%INSTALL_DIR%\certs\localhost.crt' -CertStoreLocation Cert:\LocalMachine\Root -ErrorAction Stop; Write-Host 'Certificate installed to LocalMachine\Root successfully'; Write-Host 'Certificate Thumbprint:' $cert.Thumbprint } catch { Write-Host 'PowerShell method failed:' $_.Exception.Message; exit 1 }"

if %errorLevel% neq 0 (
    echo PowerShell method failed, trying certlm...
    certlm.exe -add -c "%INSTALL_DIR%\certs\localhost.crt" -s -r localMachine root
    if %errorLevel% neq 0 (
        echo WARNING: Certificate installation failed
        echo You may need to manually install the certificate
        echo File location: %INSTALL_DIR%\certs\localhost.crt
        echo.
        echo To manually install:
        echo 1. Double-click %INSTALL_DIR%\certs\localhost.crt
        echo 2. Click "Install Certificate"
        echo 3. Select "Local Machine" and click Next
        echo 4. Select "Place all certificates in the following store"
        echo 5. Click Browse and select "Trusted Root Certification Authorities"
        echo 6. Click Next and then Finish
        echo.
        pause
    ) else (
        echo Certificate installed successfully with certlm
    )
) else (
    echo Certificate installed successfully with PowerShell
)

REM Verify certificate installation
echo Verifying certificate installation...
powershell -Command "if (Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {$_.Subject -like '*localhost*'}) { Write-Host 'Certificate verification: FOUND in certificate store' } else { Write-Host 'Certificate verification: NOT FOUND in certificate store' }"

REM Add to Windows startup (simpler approach without Node.js service)
echo Adding to Windows startup...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "%SERVICE_NAME%" /t REG_SZ /d "\"%INSTALL_DIR%\suprema-secure-proxy.exe\"" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo Startup entry added successfully
) else (
    echo WARNING: Failed to add startup entry
)

REM Start the proxy
echo Starting Suprema Secure Proxy...
start "" "%INSTALL_DIR%\suprema-secure-proxy.exe"
timeout /t 3 /nobreak >nul

REM Verify it's running
tasklist /FI "IMAGENAME eq suprema-secure-proxy.exe" 2>NUL | find /I /N "suprema-secure-proxy.exe" >NUL
if %ERRORLEVEL% equ 0 (
    echo Proxy started successfully
) else (
    echo Proxy may take a moment to start
)

REM Add firewall rule
echo Adding firewall rule...
netsh advfirewall firewall delete rule name="Suprema Secure Proxy" >nul 2>&1
netsh advfirewall firewall add rule name="Suprema Secure Proxy" dir=in action=allow protocol=TCP localport=3443 >nul 2>&1

echo.
echo ===================================
echo  Installation Complete!
echo ===================================
echo.
echo Service: %SERVICE_NAME%
echo Port: 3443 (HTTPS)
echo Installation: %INSTALL_DIR%
echo.
echo The proxy should now be running.
echo You can check if it's running by looking at Task Manager.
echo.
echo To test the proxy, visit: https://localhost:3443/health
echo.
echo *** IMPORTANT - Chrome Certificate Warning ***
echo If you see "Your connection is not private" in Chrome:
echo 1. Click "Advanced" on the warning page
echo 2. Click "Proceed to localhost (unsafe)"
echo OR
echo 1. Type "chrome://flags/#allow-insecure-localhost" in Chrome
echo 2. Enable "Allow invalid certificates for resources loaded from localhost"
echo 3. Restart Chrome
echo.
echo Management scripts:
echo   Status check: %INSTALL_DIR%\status.bat
echo   Uninstall: %INSTALL_DIR%\uninstall.bat
echo.
pause
