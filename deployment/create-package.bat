@echo off
REM Deployment Package Creator
REM This script creates a complete deployment package

echo.
echo ===================================
echo  Creating Deployment Package
echo ===================================
echo.

set PACKAGE_NAME=suprema-secure-proxy-installer
set PACKAGE_DIR=%~dp0%PACKAGE_NAME%

REM Clean and create package directory
if exist "%PACKAGE_DIR%" (
    echo Cleaning existing package directory...
    rmdir /s /q "%PACKAGE_DIR%"
)

echo Creating package directory...
mkdir "%PACKAGE_DIR%"

REM Copy all deployment files
echo Copying deployment files...
copy /Y "%~dp0suprema-secure-proxy.exe" "%PACKAGE_DIR%\"
copy /Y "%~dp0localhost.crt" "%PACKAGE_DIR%\"
copy /Y "%~dp0localhost.key" "%PACKAGE_DIR%\"
copy /Y "%~dp0install.bat" "%PACKAGE_DIR%\"
copy /Y "%~dp0install.ps1" "%PACKAGE_DIR%\"
copy /Y "%~dp0uninstall.bat" "%PACKAGE_DIR%\"
copy /Y "%~dp0status.bat" "%PACKAGE_DIR%\"
copy /Y "%~dp0README.txt" "%PACKAGE_DIR%\"

REM Create a simple start script for the package
echo @echo off > "%PACKAGE_DIR%\INSTALL.bat"
echo echo. >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo ============================================= >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo  SUPREMA SECURE PROXY INSTALLER >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo ============================================= >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo. >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo This will install the Suprema Secure Proxy as a Windows service. >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo. >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo Please ensure you have: >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo - Administrator privileges >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo - Node.js installed >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo - Port 3443 available >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo. >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo Press any key to continue with installation... >> "%PACKAGE_DIR%\INSTALL.bat"
echo pause >> "%PACKAGE_DIR%\INSTALL.bat"
echo echo. >> "%PACKAGE_DIR%\INSTALL.bat"
echo call install.bat >> "%PACKAGE_DIR%\INSTALL.bat"

echo.
echo Package created successfully!
echo Location: %PACKAGE_DIR%
echo.
echo The package contains:
dir /b "%PACKAGE_DIR%"
echo.
echo To distribute: Zip the '%PACKAGE_NAME%' folder
echo.
pause
