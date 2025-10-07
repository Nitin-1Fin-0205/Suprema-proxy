@echo off
echo ===============================================================================
echo   SUPREMA BIOMETRIC PROXY - SYSTEM STATUS
echo ===============================================================================
echo.
set SERVICE_NAME=SupremaProxy
set EXE_NAME=suprema-secure-proxy.exe
echo 🔍 Checking system status...
echo.
echo SERVICE STATUS:
sc query "%SERVICE_NAME%" >nul 2>&1
if errorlevel 1 (
    echo Status: SERVICE NOT INSTALLED
    echo ⚠️  Service is not installed. Run INSTALL.bat to install.
) else (
    echo Status: SERVICE INSTALLED
    sc query "%SERVICE_NAME%" | findstr "STATE\|DISPLAY_NAME"
)
echo.
echo PROCESS STATUS:
tasklist | findstr "%EXE_NAME%" >nul 2>&1
if errorlevel 1 (
    echo Status: PROCESS NOT RUNNING
) else (
    echo Status: PROCESS RUNNING
    tasklist | findstr "%EXE_NAME%"
)
echo.
echo NETWORK STATUS:
echo Checking port 4000...
netstat -an | findstr ":4000" >nul 2>&1
if errorlevel 1 (
    echo Status: Port 4000 NOT LISTENING
) else (
    echo Status: Port 4000 LISTENING
    netstat -an | findstr ":4000"
)
echo.
echo HEALTH CHECK:
echo Testing health endpoint...
curl -k -s https://localhost:4000/health >nul 2>&1
if errorlevel 1 (
    echo Status: Health endpoint NOT RESPONDING
) else (
    echo Status: Health endpoint RESPONDING
    echo Response:
    curl -k -s https://localhost:4000/health
)
echo.
echo FILE SYSTEM STATUS:
if exist "%~dp0%EXE_NAME%" (
    echo ✅ Main executable: FOUND
) else (
    echo ❌ Main executable: NOT FOUND
)
if exist "%~dp0certs\localhost.crt" (
    echo ✅ SSL Certificate: FOUND
) else (
    echo ❌ SSL Certificate: NOT FOUND
)
if exist "%~dp0MatcherCapture" (
    echo ✅ Biometric Engine: FOUND
) else (
    echo ❌ Biometric Engine: NOT FOUND
)
echo.
echo ===============================================================================
pause
