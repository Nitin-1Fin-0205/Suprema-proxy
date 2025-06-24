@echo off
REM Suprema Secure Proxy Status Checker
REM This script checks the status of the Suprema Secure Proxy service

echo.
echo ===================================
echo  Suprema Secure Proxy Status
echo ===================================
echo.

set SERVICE_NAME=SupremaSecureProxy
set INSTALL_DIR=C:\Program Files\Suprema Secure Proxy

REM Check if service exists and get its status
echo Checking service status...
sc query %SERVICE_NAME% >nul 2>&1
if %errorLevel% neq 0 (
    echo Service Status: NOT INSTALLED
    echo.
    echo The Suprema Secure Proxy service is not installed.
    echo Run install.bat to install the service.
    goto :end
)

REM Get detailed service information
echo Service Status: INSTALLED
sc query %SERVICE_NAME%
echo.

REM Check if installation directory exists
if exist "%INSTALL_DIR%" (
    echo Installation Directory: %INSTALL_DIR% [EXISTS]
) else (
    echo Installation Directory: %INSTALL_DIR% [MISSING]
    echo WARNING: Installation files may be missing
)

REM Check if executable exists
if exist "%INSTALL_DIR%\suprema-secure-proxy.exe" (
    echo Executable: FOUND
) else (
    echo Executable: MISSING
    echo ERROR: Main executable file is missing
)

REM Check if certificates exist
if exist "%INSTALL_DIR%\localhost.crt" (
    echo SSL Certificate: FOUND
) else (
    echo SSL Certificate: MISSING
    echo WARNING: SSL certificate file is missing
)

if exist "%INSTALL_DIR%\localhost.key" (
    echo SSL Private Key: FOUND
) else (
    echo SSL Private Key: MISSING
    echo WARNING: SSL private key file is missing
)

REM Check if logs directory exists
if exist "%INSTALL_DIR%\logs" (
    echo Logs Directory: EXISTS
    echo Recent log files:
    dir /b /o-d "%INSTALL_DIR%\logs\*.log" 2>nul | head -5
) else (
    echo Logs Directory: MISSING
)

REM Test connectivity (basic)
echo.
echo Testing connectivity...
echo Attempting to connect to https://localhost:3443/health
curl -k -s -o nul -w "HTTP Status: %%{http_code}" https://localhost:3443/health 2>nul
if %errorLevel% equ 0 (
    echo  [SUCCESS]
) else (
    echo  [FAILED]
    echo The proxy may not be responding. Check the service status above.
)

:end
echo.
echo ===================================
echo  Status Check Complete
echo ===================================
echo.
echo Commands:
echo   Start service:   sc start %SERVICE_NAME%
echo   Stop service:    sc stop %SERVICE_NAME%
echo   Restart service: sc stop %SERVICE_NAME% ^&^& sc start %SERVICE_NAME%
echo   View logs:       type "%INSTALL_DIR%\logs\secure-proxy-*.log"
echo.
pause
