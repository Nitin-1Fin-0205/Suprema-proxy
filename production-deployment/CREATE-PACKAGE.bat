@echo off
echo ====================================
echo  Suprema Secure Proxy - Package Creator
echo ====================================
echo.

set "PACKAGE_NAME=suprema-secure-proxy-v1.0.0"
set "PACKAGE_FILE=%PACKAGE_NAME%.zip"

echo Creating production package: %PACKAGE_FILE%
echo.

rem Remove existing package if it exists
if exist "%PACKAGE_FILE%" (
    echo Removing existing package...
    del "%PACKAGE_FILE%"
)

rem Create the ZIP package with all deployment files
echo Adding files to package...
powershell -Command "Compress-Archive -Path '*.exe', '*.bat', '*.txt', 'certs', 'logs', 'MatcherIdentify' -DestinationPath '%PACKAGE_FILE%' -Force"

if exist "%PACKAGE_FILE%" (
    echo.
    echo ✅ Package created successfully: %PACKAGE_FILE%
    echo.
    echo Package contents:
    echo - suprema-secure-proxy.exe (with custom icon and version info)
    echo - Installation scripts (INSTALL.bat, UNINSTALL.bat, etc.)
    echo - SSL certificates (certs folder)
    echo - Biometric matcher (MatcherIdentify folder)
    echo - Documentation (README.txt, VERSION.txt)
    echo - Log directory (logs folder)
    echo.
    echo 📦 Ready for deployment to client machines!
    echo.
    echo To deploy:
    echo 1. Extract the ZIP file on the client machine
    echo 2. Run INSTALL.bat as Administrator
    echo 3. The service will start automatically
    echo.
    exit /b 0
) else (
    echo ❌ Error: Package creation failed
    exit /b 1
)

pause
