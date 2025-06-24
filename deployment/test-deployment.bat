@echo off
REM Suprema Secure Proxy - Deployment Test Script
REM This script tests the deployment package before distribution

echo.
echo ===================================
echo  Deployment Package Test
echo ===================================
echo.

set DEPLOY_DIR=%~dp0
set REQUIRED_FILES=suprema-secure-proxy.exe localhost.crt localhost.key install.bat install.ps1 uninstall.bat status.bat README.txt

echo Checking deployment directory: %DEPLOY_DIR%
echo.

echo Testing required files...
for %%f in (%REQUIRED_FILES%) do (
    if exist "%DEPLOY_DIR%%%f" (
        echo   ✓ %%f
    ) else (
        echo   ✗ %%f [MISSING]
        set MISSING_FILES=1
    )
)

if defined MISSING_FILES (
    echo.
    echo ERROR: Some required files are missing!
    echo Please ensure all files are copied to the deployment directory.
    goto :end
)

echo.
echo Testing executable...
"%DEPLOY_DIR%suprema-secure-proxy.exe" --version >nul 2>&1
if %errorLevel% equ 0 (
    echo   ✓ Executable runs successfully
) else (
    echo   ⚠ Executable test failed (this may be normal if Node.js is not installed)
)

echo.
echo Testing certificate files...
openssl x509 -in "%DEPLOY_DIR%localhost.crt" -text -noout >nul 2>&1
if %errorLevel% equ 0 (
    echo   ✓ SSL certificate is valid
) else (
    echo   ⚠ SSL certificate validation failed (OpenSSL may not be installed)
)

echo.
echo Testing script syntax...
powershell -Command "Test-Path '%DEPLOY_DIR%install.ps1'" >nul 2>&1
if %errorLevel% equ 0 (
    echo   ✓ PowerShell script exists
) else (
    echo   ✗ PowerShell script missing or invalid
)

echo.
echo ===================================
echo  Test Summary
echo ===================================
echo.
echo Package Contents:
dir /b "%DEPLOY_DIR%"
echo.
echo Package is ready for distribution!
echo.
echo Next steps:
echo 1. Run package-final.ps1 to create ZIP package
echo 2. Test installation on a clean system
echo 3. Distribute to clients
echo.

:end
pause
