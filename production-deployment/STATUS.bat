@echo off
echo ========================================
echo   SUPREMA BIOMETRIC PROXY STATUS
echo ========================================
echo.

echo Checking Windows Service...
sc query "SupremaProxy" >nul 2>&1
if errorlevel 1 (
    echo Status: Service NOT INSTALLED
) else (
    sc query "SupremaProxy" | findstr "STATE"
)

echo.
echo Checking running processes...
tasklist /FI "IMAGENAME eq suprema-secure-proxy.exe" 2>nul | findstr /I suprema-secure-proxy.exe
if errorlevel 1 (
    echo Status: Process NOT RUNNING
) else (
    echo Status: Process RUNNING
)

echo.
echo Checking port 4000...
netstat -ano | findstr :4000 >nul 2>&1
if errorlevel 1 (
    echo Status: Port 4000 NOT IN USE
) else (
    echo Status: Port 4000 IN USE
    netstat -ano | findstr :4000
)

echo.
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
echo Registry startup entry...
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "SupremaProxy" >nul 2>&1
if errorlevel 1 (
    echo Status: Registry entry NOT FOUND
) else (
    echo Status: Registry entry EXISTS
)

echo.
echo Scheduled task...
schtasks /query /tn "SupremaProxyService" >nul 2>&1
if errorlevel 1 (
    echo Status: Scheduled task NOT FOUND
) else (
    echo Status: Scheduled task EXISTS
)

echo.
echo ========================================
pause
