@echo off
echo ========================================
echo   SUPREMA BIOMETRIC PROXY UNINSTALLER
echo ========================================
echo.
echo This will completely remove the Suprema Biometric Proxy
echo and all auto-start configurations.
echo.
pause

echo.
echo [1/5] Stopping service...
sc stop "SupremaProxy" >nul 2>&1
taskkill /IM suprema-secure-proxy.exe /F >nul 2>&1

echo [2/5] Removing Windows Service...
sc delete "SupremaProxy" >nul 2>&1

echo [3/5] Removing registry startup entry...
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "SupremaProxy" /f >nul 2>&1

echo [4/5] Removing scheduled task...
schtasks /delete /tn "SupremaProxyService" /f >nul 2>&1

echo [5/5] Removing trusted certificate...
certutil -delstore "Root" "localhost" >nul 2>&1

echo.
echo ========================================
echo   UNINSTALLATION COMPLETED!
echo ========================================
echo.
echo All Suprema Biometric Proxy components have been removed.
echo The application files remain - you can delete this folder manually.
echo.
pause
