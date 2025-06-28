@echo off
echo Stopping Suprema Biometric Proxy Service...
echo.

sc stop "SupremaProxy"
echo.
echo Killing any remaining processes...
taskkill /IM suprema-secure-proxy.exe /F >nul 2>&1

echo.
echo Service stopped.
pause
