@echo off
echo ========================================
echo   SUPREMA BIOMETRIC PROXY INSTALLER
echo ========================================
echo.
echo This will install the Suprema Biometric Proxy as a Windows Service
echo with automatic startup capabilities.
echo.
echo REQUIREMENTS:
echo - Run as Administrator
echo - Port 4000 available
echo.
pause

echo.
echo [1/4] Stopping any existing service...
sc stop "SupremaProxy" >nul 2>&1
taskkill /IM suprema-secure-proxy.exe /F >nul 2>&1

rem Remove Windows service if it exists (no longer needed)
sc query "SupremaProxy" >nul 2>&1
if not errorlevel 1 (
    echo Existing service found. Deleting...
    sc delete "SupremaProxy" >nul 2>&1
    timeout /t 2 >nul
)

echo [2/4] Adding registry startup entry...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "SupremaProxy" /t REG_SZ /d "%~dp0suprema-secure-proxy.exe" /f >nul 2>&1

echo [3/4] Creating scheduled task...
schtasks /create /tn "SupremaProxyService" /tr "%~dp0suprema-secure-proxy.exe" /sc onstart /ru SYSTEM /rl HIGHEST /f >nul 2>&1

echo [4/4] Trusting SSL certificate...
certutil -addstore -f "Root" "%~dp0certs\localhost.crt" >nul 2>&1

rem Do NOT start the EXE manually here; scheduled task/registry will handle background start

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
echo   STATUS.bat  - Check status
echo   START.bat   - Start manually
echo   STOP.bat    - Stop
echo   UNINSTALL.bat - Remove completely
echo.
echo The proxy will now start automatically in the background when Windows boots!
echo.
pause
