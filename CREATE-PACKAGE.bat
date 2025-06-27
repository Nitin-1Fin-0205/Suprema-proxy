@echo off
echo ========================================
echo   CREATING DISTRIBUTION PACKAGE
echo ========================================
echo.

echo Compressing production deployment...
powershell -Command "Compress-Archive -Path 'production-deployment\*' -DestinationPath 'SupremaProxy-v1.0.0-Production.zip' -Force"

if exist "SupremaProxy-v1.0.0-Production.zip" (
    echo.
    echo ✅ SUCCESS: Distribution package created!
    echo.
    echo 📦 Package: SupremaProxy-v1.0.0-Production.zip
    echo 📐 Size: 
    dir "SupremaProxy-v1.0.0-Production.zip" | findstr "SupremaProxy"
    echo.
    echo 🚀 READY FOR CLIENT DEPLOYMENT!
    echo.
    echo 📋 Instructions for client:
    echo 1. Extract ZIP file to C:\SupremaProxy\
    echo 2. Run INSTALL.bat as Administrator  
    echo 3. Done - service runs automatically!
    echo.
) else (
    echo ❌ ERROR: Failed to create package
)

pause
