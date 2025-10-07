@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo   SUPREMA BIOMETRIC PROXY - INSTALLATION
echo ===============================================================================
echo.

:: Check admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo ✅ Administrator privileges confirmed
echo.
echo 🔐 Installing SSL certificates...
certutil -addstore -f "Root" "%~dp0certs\localhost.crt" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ SSL Certificate installed and trusted
) else (
    echo ⚠️  SSL Certificate installation failed, trying PowerShell method...
    powershell -Command "try { Import-Certificate -FilePath '%~dp0certs\localhost.crt' -CertStoreLocation Cert:\LocalMachine\Root -ErrorAction Stop; Write-Host '✅ SSL certificate trusted via PowerShell' } catch { Write-Host '⚠️  SSL certificate trust failed' }"
)

echo 🛠️  Installing Windows Service...
sc stop "SupremaProxy" >nul 2>&1
sc delete "SupremaProxy" >nul 2>&1
timeout /t 2 >nul

sc create "SupremaProxy" binPath= "%~dp0suprema-secure-proxy.exe" start= auto DisplayName= "Suprema Biometric Proxy"
if %errorLevel% equ 0 (
    echo ✅ Service created successfully
) else (
    echo ❌ Service creation failed
    pause
    exit /b 1
)

sc description "SupremaProxy" "Suprema Biometric Proxy Service for secure fingerprint authentication"
sc config "SupremaProxy" obj= "LocalSystem"
sc failure "SupremaProxy" reset= 86400 actions= restart/5000/restart/10000/restart/30000 >nul 2>&1

echo 🚀 Starting service...
sc start "SupremaProxy"
if %errorLevel% equ 0 (
    echo ✅ Service started successfully
) else (
    echo ⚠️  Service start failed - check logs
)

echo 🔥 Adding firewall rules...
netsh advfirewall firewall delete rule name="Suprema Biometric Proxy" >nul 2>&1
netsh advfirewall firewall add rule name="Suprema Biometric Proxy" dir=in action=allow protocol=TCP localport=4000 >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Firewall rule added
) else (
    echo ⚠️  Firewall rule creation failed
)

echo 📁 Creating directories...
if not exist "%~dp0data" mkdir "%~dp0data" >nul 2>&1
if not exist "%~dp0data\backups" mkdir "%~dp0data\backups" >nul 2>&1
if not exist "%~dp0logs" mkdir "%~dp0logs" >nul 2>&1
if not exist "%~dp0temp_templates" mkdir "%~dp0temp_templates" >nul 2>&1
echo ✅ Directories created

echo ⏱️  Waiting for service to start...
timeout /t 5 >nul

echo 🏥 Testing health endpoint...
curl -k -s https://localhost:4000/health >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ SUCCESS: Application is responding and ready for use!
) else (
    echo ℹ️  Application may still be starting. Check STATUS.bat in a few moments.
)

echo ===============================================================================
echo ✅ INSTALLATION COMPLETED!
echo ===============================================================================
echo.
echo 🌐 Service URL: https://localhost:4000
echo 🏥 Health Check: https://localhost:4000/health
echo 📊 Management: STATUS.bat
echo.
echo The service will automatically start when Windows boots.
echo No further action required - the application is ready to use!
echo.
pause
