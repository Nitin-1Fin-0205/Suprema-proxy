rem NSSM-based Suprema Proxy Service Installer
@echo off
echo ========================================
echo   SUPREMA BIOMETRIC PROXY INSTALLER
echo ========================================
echo.
echo This will install the Suprema Biometric Proxy as a Windows Service (hidden, auto-restart).
echo.
echo REQUIREMENTS:
echo - Run as Administrator
echo - Port 4000 available
echo - nssm.exe present in this folder
echo.
pause

rem Check if nssm.exe exists in the current folder
if not exist "%~dp0nssm.exe" (
    echo ERROR: nssm.exe not found in this folder!
    echo Please download NSSM from https://nssm.cc/download and place nssm.exe here.
    pause
    exit /b 1
)

set "NSSM=%~dp0nssm.exe"

echo.
echo [1/3] Stopping and removing any existing service...
%NSSM% stop SupremaProxy >nul 2>&1
%NSSM% remove SupremaProxy confirm >nul 2>&1

echo [2/3] Installing service with NSSM...
%NSSM% install SupremaProxy "%~dp0suprema-secure-proxy.exe"
%NSSM% set SupremaProxy Start SERVICE_AUTO_START
%NSSM% set SupremaProxy AppDirectory "%~dp0"
%NSSM% set SupremaProxy AppStdout "%~dp0logs\service.log"
%NSSM% set SupremaProxy AppStderr "%~dp0logs\service-error.log"
%NSSM% set SupremaProxy AppStopMethodSkip 6
%NSSM% set SupremaProxy AppNoConsole 1

echo [3/3] Trusting SSL certificate...
certutil -addstore -f "Root" "%~dp0certs\localhost.crt" >nul 2>&1

echo.
echo ========================================
echo   INSTALLATION COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Access URLs:
echo   https://localhost:4000/health
echo   https://localhost:4000/bio/identify-fingerprint
echo.
echo Management:
echo   nssm start SupremaProxy   - Start service
echo   nssm stop SupremaProxy    - Stop service
echo   nssm restart SupremaProxy - Restart service
echo   nssm remove SupremaProxy  - Uninstall service
echo.
echo The proxy will now run as a true Windows service (hidden, auto-restart)!
echo.
pause
