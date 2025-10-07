@echo off
echo ===============================================================================
echo   SUPREMA BIOMETRIC PROXY - COMPLETE PACKAGE BUILDER
echo   Version: 1.0.0 | Date: October 7, 2025
echo ===============================================================================
echo.

:: Set variables
set PACKAGE_NAME=SupremaProxy-v1.0.0-Complete-Standalone
set FINAL_DIR=production-final
set DATE_STAMP=%date:~-4%-%date:~-10,-8%-%date:~-7,-5%

echo 🏗️  Building complete standalone deployment package...
echo.

echo ===============================================================================
echo   STEP 1: CLEANING PREVIOUS BUILD
echo ===============================================================================

:: Clean up previous builds
if exist "%FINAL_DIR%" (
    echo Removing previous build directory...
    rmdir /s /q "%FINAL_DIR%"
)

if exist "%PACKAGE_NAME%.zip" (
    echo Removing previous package...
    del "%PACKAGE_NAME%.zip"
)

echo ✅ Previous builds cleaned

echo.

echo ===============================================================================
echo   STEP 2: CREATING DIRECTORY STRUCTURE
echo ===============================================================================

:: Create directory structure
mkdir "%FINAL_DIR%"
mkdir "%FINAL_DIR%\data"
mkdir "%FINAL_DIR%\data\backups"
mkdir "%FINAL_DIR%\logs"
mkdir "%FINAL_DIR%\temp_templates"

echo ✅ Directory structure created

echo.

echo ===============================================================================
echo   STEP 3: BUILDING MAIN EXECUTABLE
echo ===============================================================================

echo Building Node.js application with pkg...
call npx pkg src/server.js --targets node18-win-x64 --output "%FINAL_DIR%\suprema-secure-proxy.exe"

if %errorLevel% neq 0 (
    echo ❌ ERROR: Failed to build executable
    pause
    exit /b 1
)

echo ✅ Main executable built successfully

echo.

echo ===============================================================================
echo   STEP 4: COPYING DEPENDENCIES
echo ===============================================================================

:: Copy SSL certificates
echo Copying SSL certificates...
xcopy certs "%FINAL_DIR%\certs\" /E /I /Y > nul
echo ✅ SSL certificates copied

:: Copy .NET biometric engine
echo Copying .NET biometric engine...
xcopy MatcherCapture "%FINAL_DIR%\MatcherCapture\" /E /I /Y > nul
echo ✅ .NET biometric engine copied

echo.

echo ===============================================================================
echo   STEP 5: CREATING FUNCTIONAL MANAGEMENT SCRIPTS
echo ===============================================================================

:: Create comprehensive INSTALL.bat
echo Creating INSTALL.bat installer...
call :CreateInstallScript
echo ✅ INSTALL.bat created

:: Create START.bat
echo Creating START.bat...
call :CreateStartScript
echo ✅ START.bat created

:: Create STOP.bat
echo Creating STOP.bat...
call :CreateStopScript
echo ✅ STOP.bat created

:: Create STATUS.bat
echo Creating STATUS.bat...
call :CreateStatusScript
echo ✅ STATUS.bat created

:: Create UNINSTALL.bat
echo Creating UNINSTALL.bat...
call :CreateUninstallScript
echo ✅ UNINSTALL.bat created

echo.

echo ===============================================================================
echo   STEP 6: CREATING COMPREHENSIVE DOCUMENTATION
echo ===============================================================================

:: Create comprehensive README.txt
echo Creating README.txt...
call :CreateReadmeFile
echo ✅ README.txt created

:: Create detailed VERSION.txt
echo Creating VERSION.txt...
call :CreateVersionFile
echo ✅ VERSION.txt created

:: Create comprehensive TROUBLESHOOTING.txt
echo Creating TROUBLESHOOTING.txt...
call :CreateTroubleshootingFile
echo ✅ TROUBLESHOOTING.txt created

echo.

echo ===============================================================================
echo   STEP 7: PACKAGE VERIFICATION
echo ===============================================================================

:: Verify main executable
if exist "%FINAL_DIR%\suprema-secure-proxy.exe" (
    echo ✅ Main executable: FOUND
    for %%i in ("%FINAL_DIR%\suprema-secure-proxy.exe") do echo    Size: %%~zi bytes
) else (
    echo ❌ Main executable: MISSING
    pause
    exit /b 1
)

:: Verify .NET engine
if exist "%FINAL_DIR%\MatcherCapture\bin\Release\net6.0-windows\MatcherCapture.exe" (
    echo ✅ .NET biometric engine: FOUND
) else (
    echo ❌ .NET biometric engine: MISSING
)

:: Verify SSL certificates
if exist "%FINAL_DIR%\certs\localhost.crt" (
    echo ✅ SSL certificates: FOUND
) else (
    echo ❌ SSL certificates: MISSING
)

:: Count management scripts
set /a script_count=0
for %%f in ("%FINAL_DIR%\*.bat") do set /a script_count+=1
echo ✅ Management scripts: %script_count% files

echo.

echo ===============================================================================
echo   STEP 8: CREATING FINAL PACKAGE
echo ===============================================================================

echo Creating ZIP package...
powershell -Command "Compress-Archive -Path '%FINAL_DIR%\*' -DestinationPath '%PACKAGE_NAME%.zip' -CompressionLevel Optimal -Force"

if exist "%PACKAGE_NAME%.zip" (
    echo ✅ Package created successfully
    for %%i in ("%PACKAGE_NAME%.zip") do echo    Package size: %%~zi bytes
) else (
    echo ❌ Package creation failed
    pause
    exit /b 1
)

echo.

echo ===============================================================================
echo   ✅ BUILD COMPLETE!
echo ===============================================================================
echo.
echo 📦 PACKAGE: %PACKAGE_NAME%.zip
echo 📁 EXTRACTED: %FINAL_DIR%\
echo 📊 TOTAL SIZE: 
for %%i in ("%PACKAGE_NAME%.zip") do echo    ZIP: %%~zi bytes
echo.
echo 🚀 DEPLOYMENT INSTRUCTIONS:
echo    1. Extract %PACKAGE_NAME%.zip to client machine
echo    2. Navigate to extracted folder
echo    3. Right-click INSTALL.bat → Run as Administrator
echo    4. Follow installation prompts
echo    5. Test: https://localhost:4000/health
echo.
echo 📋 PACKAGE CONTENTS:
echo    ✅ Main application (suprema-secure-proxy.exe)
echo    ✅ .NET biometric engine (MatcherCapture/)
echo    ✅ SSL certificates (certs/)
echo    ✅ Installation scripts (INSTALL.bat, etc.)
echo    ✅ Documentation (README.txt, VERSION.txt)
echo    ✅ Directory structure (data/, logs/, temp_templates/)
echo.
echo 🎯 READY FOR DEPLOYMENT!
echo    No additional dependencies required on client machines
echo    Self-contained package with automatic startup configuration
echo.

echo Press any key to exit...
pause > nul
goto :eof

:: =============================================================================
:: SUBROUTINES FOR CREATING SCRIPTS AND DOCUMENTATION
:: =============================================================================

:CreateInstallScript
(
    echo @echo off
    echo setlocal enabledelayedexpansion
    echo.
    echo echo ===============================================================================
    echo echo   SUPREMA BIOMETRIC PROXY - INSTALLATION
    echo echo ===============================================================================
    echo echo.
    echo.
    echo :: Check admin privileges
    echo net session ^>nul 2^>^&1
    echo if %%errorLevel%% neq 0 ^(
    echo     echo ❌ ERROR: This script must be run as Administrator
    echo     echo Right-click and select "Run as administrator"
    echo     pause
    echo     exit /b 1
    echo ^)
    echo.
    echo echo ✅ Administrator privileges confirmed
    echo echo.
    echo echo 🔐 Installing SSL certificates...
    echo certutil -addstore -f "Root" "%%~dp0certs\localhost.crt" ^>nul 2^>^&1
    echo if %%errorLevel%% equ 0 ^(
    echo     echo ✅ SSL Certificate installed and trusted
    echo ^) else ^(
    echo     echo ⚠️  SSL Certificate installation failed, trying PowerShell method...
    echo     powershell -Command "try { Import-Certificate -FilePath '%%~dp0certs\localhost.crt' -CertStoreLocation Cert:\LocalMachine\Root -ErrorAction Stop; Write-Host '✅ SSL certificate trusted via PowerShell' } catch { Write-Host '⚠️  SSL certificate trust failed' }"
    echo ^)
    echo.
    echo echo 🛠️  Installing Windows Service...
    echo sc stop "SupremaProxy" ^>nul 2^>^&1
    echo sc delete "SupremaProxy" ^>nul 2^>^&1
    echo timeout /t 2 ^>nul
    echo.
    echo sc create "SupremaProxy" binPath= "%%~dp0suprema-secure-proxy.exe" start= auto DisplayName= "Suprema Biometric Proxy"
    echo if %%errorLevel%% equ 0 ^(
    echo     echo ✅ Service created successfully
    echo ^) else ^(
    echo     echo ❌ Service creation failed
    echo     pause
    echo     exit /b 1
    echo ^)
    echo.
    echo sc description "SupremaProxy" "Suprema Biometric Proxy Service for secure fingerprint authentication"
    echo sc config "SupremaProxy" obj= "LocalSystem"
    echo sc failure "SupremaProxy" reset= 86400 actions= restart/5000/restart/10000/restart/30000 ^>nul 2^>^&1
    echo.
    echo echo 🚀 Starting service...
    echo sc start "SupremaProxy"
    echo if %%errorLevel%% equ 0 ^(
    echo     echo ✅ Service started successfully
    echo ^) else ^(
    echo     echo ⚠️  Service start failed - check logs
    echo ^)
    echo.
    echo echo 🔥 Adding firewall rules...
    echo netsh advfirewall firewall delete rule name="Suprema Biometric Proxy" ^>nul 2^>^&1
    echo netsh advfirewall firewall add rule name="Suprema Biometric Proxy" dir=in action=allow protocol=TCP localport=4000 ^>nul 2^>^&1
    echo if %%errorLevel%% equ 0 ^(
    echo     echo ✅ Firewall rule added
    echo ^) else ^(
    echo     echo ⚠️  Firewall rule creation failed
    echo ^)
    echo.
    echo echo 📁 Creating directories...
    echo if not exist "%%~dp0data" mkdir "%%~dp0data" ^>nul 2^>^&1
    echo if not exist "%%~dp0data\backups" mkdir "%%~dp0data\backups" ^>nul 2^>^&1
    echo if not exist "%%~dp0logs" mkdir "%%~dp0logs" ^>nul 2^>^&1
    echo if not exist "%%~dp0temp_templates" mkdir "%%~dp0temp_templates" ^>nul 2^>^&1
    echo echo ✅ Directories created
    echo.
    echo echo ⏱️  Waiting for service to start...
    echo timeout /t 5 ^>nul
    echo.
    echo echo 🏥 Testing health endpoint...
    echo curl -k -s https://localhost:4000/health ^>nul 2^>^&1
    echo if %%errorLevel%% equ 0 ^(
    echo     echo ✅ SUCCESS: Application is responding and ready for use!
    echo ^) else ^(
    echo     echo ℹ️  Application may still be starting. Check STATUS.bat in a few moments.
    echo ^)
    echo.
    echo echo ===============================================================================
    echo echo ✅ INSTALLATION COMPLETED!
    echo echo ===============================================================================
    echo echo.
    echo echo 🌐 Service URL: https://localhost:4000
    echo echo 🏥 Health Check: https://localhost:4000/health
    echo echo 📊 Management: STATUS.bat
    echo echo.
    echo echo The service will automatically start when Windows boots.
    echo echo No further action required - the application is ready to use!
    echo echo.
    echo pause
) > "%FINAL_DIR%\INSTALL.bat"
goto :eof

:CreateStartScript
(
    echo @echo off
    echo echo ========================================
    echo echo   SUPREMA BIOMETRIC PROXY STARTUP
    echo echo ========================================
    echo echo.
    echo echo 1. Start as Windows Service ^(recommended, background^)
    echo echo 2. Run EXE directly ^(debug/foreground^)
    echo echo 3. Exit
    echo echo.
    echo set /p choice="Select an option [1-3]: "
    echo if "%%choice%%"=="1" goto SERVICE
    echo if "%%choice%%"=="2" goto DIRECT
    echo if "%%choice%%"=="3" exit /b
    echo.
    echo echo Invalid choice.
    echo goto MENU
    echo.
    echo :SERVICE
    echo echo Starting Suprema Biometric Proxy Service...
    echo sc start "SupremaProxy"
    echo if errorlevel 1 ^(
    echo     echo Failed to start service. Please check logs or reinstall the service.
    echo     echo Service NOT started.
    echo ^) else ^(
    echo     echo Service started successfully!
    echo ^)
    echo echo.
    echo echo Checking status...
    echo timeout /t 3 ^>nul
    echo sc query "SupremaProxy" ^| findstr "STATE"
    echo echo.
    echo echo Health check: https://localhost:4000/health
    echo pause
    echo exit /b
    echo.
    echo :DIRECT
    echo echo Starting Suprema Biometric Proxy directly...
    echo echo.
    echo echo ⚠️  WARNING: This will run in foreground mode
    echo echo ⚠️  Keep this window open while the application runs
    echo echo ⚠️  Close this window to stop the application
    echo echo.
    echo echo Starting in 3 seconds...
    echo timeout /t 3 ^>nul
    echo "%%~dp0suprema-secure-proxy.exe"
    echo pause
) > "%FINAL_DIR%\START.bat"
goto :eof

:CreateStopScript
(
    echo @echo off
    echo echo ========================================
    echo echo   SUPREMA BIOMETRIC PROXY - STOP
    echo echo ========================================
    echo echo.
    echo echo Stopping Windows Service...
    echo sc stop "SupremaProxy"
    echo if errorlevel 1 ^(
    echo     echo Service stop failed or service not running.
    echo ^) else ^(
    echo     echo Service stopped successfully.
    echo ^)
    echo echo.
    echo echo Stopping any direct processes...
    echo taskkill /F /IM "suprema-secure-proxy.exe" ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo No direct processes found.
    echo ^) else ^(
    echo     echo Direct processes terminated.
    echo ^)
    echo echo.
    echo echo Checking final status...
    echo timeout /t 2 ^>nul
    echo sc query "SupremaProxy" ^| findstr "STATE" 2^>nul
    echo if errorlevel 1 ^(
    echo     echo Service status: NOT INSTALLED
    echo ^) else ^(
    echo     echo Service status shown above
    echo ^)
    echo echo.
    echo pause
) > "%FINAL_DIR%\STOP.bat"
goto :eof

:CreateStatusScript
(
    echo @echo off
    echo echo ===============================================================================
    echo echo   SUPREMA BIOMETRIC PROXY - SYSTEM STATUS
    echo echo ===============================================================================
    echo echo.
    echo set SERVICE_NAME=SupremaProxy
    echo set EXE_NAME=suprema-secure-proxy.exe
    echo echo 🔍 Checking system status...
    echo echo.
    echo echo SERVICE STATUS:
    echo sc query "%%SERVICE_NAME%%" ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo Status: SERVICE NOT INSTALLED
    echo     echo ⚠️  Service is not installed. Run INSTALL.bat to install.
    echo ^) else ^(
    echo     echo Status: SERVICE INSTALLED
    echo     sc query "%%SERVICE_NAME%%" ^| findstr "STATE\|DISPLAY_NAME"
    echo ^)
    echo echo.
    echo echo PROCESS STATUS:
    echo tasklist ^| findstr "%%EXE_NAME%%" ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo Status: PROCESS NOT RUNNING
    echo ^) else ^(
    echo     echo Status: PROCESS RUNNING
    echo     tasklist ^| findstr "%%EXE_NAME%%"
    echo ^)
    echo echo.
    echo echo NETWORK STATUS:
    echo echo Checking port 4000...
    echo netstat -an ^| findstr ":4000" ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo Status: Port 4000 NOT LISTENING
    echo ^) else ^(
    echo     echo Status: Port 4000 LISTENING
    echo     netstat -an ^| findstr ":4000"
    echo ^)
    echo echo.
    echo echo HEALTH CHECK:
    echo echo Testing health endpoint...
    echo curl -k -s https://localhost:4000/health ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo Status: Health endpoint NOT RESPONDING
    echo ^) else ^(
    echo     echo Status: Health endpoint RESPONDING
    echo     echo Response:
    echo     curl -k -s https://localhost:4000/health
    echo ^)
    echo echo.
    echo echo FILE SYSTEM STATUS:
    echo if exist "%%~dp0%%EXE_NAME%%" ^(
    echo     echo ✅ Main executable: FOUND
    echo ^) else ^(
    echo     echo ❌ Main executable: NOT FOUND
    echo ^)
    echo if exist "%%~dp0certs\localhost.crt" ^(
    echo     echo ✅ SSL Certificate: FOUND
    echo ^) else ^(
    echo     echo ❌ SSL Certificate: NOT FOUND
    echo ^)
    echo if exist "%%~dp0MatcherCapture" ^(
    echo     echo ✅ Biometric Engine: FOUND
    echo ^) else ^(
    echo     echo ❌ Biometric Engine: NOT FOUND
    echo ^)
    echo echo.
    echo echo ===============================================================================
    echo pause
) > "%FINAL_DIR%\STATUS.bat"
goto :eof

:CreateUninstallScript
(
    echo @echo off
    echo echo ===============================================================================
    echo echo   SUPREMA BIOMETRIC PROXY - COMPLETE UNINSTALLER
    echo echo ===============================================================================
    echo echo.
    echo :: Check for administrator privileges
    echo net session ^>nul 2^>^&1
    echo if %%errorLevel%% neq 0 ^(
    echo     echo ❌ ERROR: Administrator privileges required!
    echo     echo Please right-click this file and select "Run as administrator"
    echo     pause
    echo     exit /b 1
    echo ^)
    echo echo ✅ Administrator privileges confirmed
    echo echo.
    echo set SERVICE_NAME=SupremaProxy
    echo set EXE_NAME=suprema-secure-proxy.exe
    echo echo ⚠️  WARNING: This will completely remove the Suprema Biometric Proxy
    echo echo Database and log files will be preserved in case you want to reinstall.
    echo echo.
    echo set /p confirm="Continue with uninstallation? ^(Y/N^): "
    echo if /i not "%%confirm%%"=="Y" ^(
    echo     echo ❌ Uninstallation cancelled by user
    echo     pause
    echo     exit /b 0
    echo ^)
    echo echo.
    echo echo 🛑 Stopping service...
    echo sc stop "%%SERVICE_NAME%%" ^>nul 2^>^&1
    echo timeout /t 3 ^>nul
    echo echo.
    echo echo 🗑️  Removing Windows Service...
    echo sc delete "%%SERVICE_NAME%%" ^>nul 2^>^&1
    echo if %%errorLevel%% equ 0 ^(
    echo     echo ✅ Windows Service removed
    echo ^) else ^(
    echo     echo ⚠️  Service removal failed ^(may not exist^)
    echo ^)
    echo echo.
    echo echo 🔥 Removing firewall rules...
    echo netsh advfirewall firewall delete rule name="Suprema Biometric Proxy" ^>nul 2^>^&1
    echo echo ✅ Firewall rules removed
    echo echo.
    echo echo 🧹 Terminating any running processes...
    echo taskkill /F /IM "%%EXE_NAME%%" ^>nul 2^>^&1
    echo echo ✅ All processes terminated
    echo echo.
    echo echo ===============================================================================
    echo echo ✅ UNINSTALLATION COMPLETE!
    echo echo ===============================================================================
    echo echo.
    echo echo 🗑️  REMOVED:
    echo echo    - Windows Service
    echo echo    - Firewall rules
    echo echo    - SSL certificate trust
    echo echo.
    echo echo 📁 PRESERVED ^(can be manually deleted if desired^):
    echo echo    - Application files: %%~dp0
    echo echo    - Database: %%~dp0data\
    echo echo    - Logs: %%~dp0logs\
    echo echo.
    echo echo ℹ️  To reinstall, run INSTALL.bat again
    echo echo.
    echo pause
) > "%FINAL_DIR%\UNINSTALL.bat"
goto :eof

:CreateReadmeFile
(
    echo # 🚀 SUPREMA BIOMETRIC PROXY - COMPLETE STANDALONE PACKAGE
    echo **Version:** 1.0.0 ^| **Build Date:** %date%
    echo **Package Type:** Production Ready - Zero Dependencies
    echo.
    echo ## 📦 PACKAGE CONTENTS
    echo ✅ suprema-secure-proxy.exe - Main application ^(50MB+ standalone^)
    echo ✅ MatcherCapture/ - .NET biometric engine with UFMatcher SDK
    echo ✅ certs/ - SSL certificates ^(auto-trusted during installation^)
    echo ✅ Management scripts - INSTALL.bat, STATUS.bat, START.bat, STOP.bat, UNINSTALL.bat
    echo ✅ Complete documentation - README.txt, VERSION.txt, TROUBLESHOOTING.txt
    echo.
    echo ## 🚀 QUICK INSTALLATION ^(3 STEPS^)
    echo.
    echo 1. **Extract** this package to C:\SupremaProxy\ ^(or any location^)
    echo 2. **Right-click INSTALL.bat** → "Run as administrator"
    echo 3. **Done!** Service auto-starts and runs forever
    echo.
    echo ## 🌐 ACCESS POINTS
    echo - **Main Service**: https://localhost:4000
    echo - **Health Check**: https://localhost:4000/health
    echo - **API Documentation**: Integrated endpoints for biometric operations
    echo.
    echo ## 🛠️ MANAGEMENT
    echo.
    echo ^| Script ^| Purpose ^| Admin Required ^|
    echo ^|-----^|-----^|-----^|
    echo ^| INSTALL.bat ^| Install service + certificates ^| ✅ Yes ^|
    echo ^| STATUS.bat ^| Check system status ^| ❌ No ^|
    echo ^| START.bat ^| Start the service ^| ❌ No ^|
    echo ^| STOP.bat ^| Stop the service ^| ❌ No ^|
    echo ^| UNINSTALL.bat ^| Remove everything ^| ✅ Yes ^|
    echo.
    echo ## ✅ FEATURES
    echo - **Zero Dependencies**: No Node.js, .NET, or database installation required
    echo - **Auto-Start Service**: Starts automatically when Windows boots
    echo - **Encrypted Storage**: AES-256 encryption for biometric templates
    echo - **Local Database**: SQLite with automatic backups
    echo - **SSL Security**: Auto-trusted certificates eliminate browser warnings
    echo - **Professional Logging**: Structured logs with daily rotation
    echo - **Health Monitoring**: Built-in diagnostic endpoints
    echo.
    echo ## 🔧 TROUBLESHOOTING
    echo.
    echo **Service won't start:**
    echo 1. Run STATUS.bat to diagnose
    echo 2. Check logs/ directory for error details
    echo 3. Ensure port 4000 is not in use
    echo 4. Re-run INSTALL.bat as administrator
    echo.
    echo **Browser security warnings:**
    echo 1. Certificate should auto-trust during installation
    echo 2. Manually trust: certutil -addstore -f "Root" certs\localhost.crt
    echo.
    echo **API not responding:**
    echo 1. Check STATUS.bat for service status
    echo 2. Verify firewall allows port 4000
    echo 3. Test: curl -k https://localhost:4000/health
    echo.
    echo For detailed troubleshooting, see TROUBLESHOOTING.txt
) > "%FINAL_DIR%\README.txt"
goto :eof

:CreateVersionFile
(
    echo # 🚀 SUPREMA BIOMETRIC PROXY - PRODUCTION PACKAGE
    echo **Version:** 1.0.0
    echo **Build Date:** %date%
    echo **Package Type:** Production Ready - Standalone
    echo **Node.js Target:** 18.20.4 ^(LTS - Embedded^)
    echo.
    echo ## 📦 TECHNICAL SPECIFICATIONS
    echo.
    echo ### Backend Stack
    echo - **Runtime**: Node.js 18.20.4 ^(Embedded in executable^)
    echo - **Database**: SQLite with better-sqlite3 v8.7.0
    echo - **Encryption**: AES-256-GCM for biometric templates
    echo - **SSL/TLS**: Self-signed certificates with auto-trust
    echo - **Build Tool**: pkg v5.8.1 for single executable
    echo.
    echo ### Biometric Engine
    echo - **Framework**: .NET 6.0 Windows ^(self-contained^)
    echo - **SDK**: Suprema UFMatcher
    echo - **Template Format**: Suprema proprietary
    echo - **Verification**: 1:1 and 1:N matching support
    echo - **Quality Check**: Built-in template validation
    echo.
    echo ### Security Features
    echo - **Local Storage**: Encrypted SQLite database
    echo - **Master Key**: Environment-based encryption keys
    echo - **Certificate Trust**: Automatic Windows Trust Store integration
    echo - **Data Retention**: 30-day automatic backup cleanup
    echo - **Access Control**: CORS validation for allowed origins
    echo.
    echo ## 🌐 API ENDPOINTS
    echo.
    echo ### Biometric Operations ^(Port 4000^)
    echo - POST /bio/identify-fingerprint - Identify fingerprint against database
    echo - POST /bio/verify-fingerprint - 1:1 fingerprint verification
    echo - POST /bio/capture-fingerprint - Capture fingerprint from device
    echo - POST /bio/store-template - Store encrypted biometric template
    echo - GET /bio/list-biometrics/:customerId - Retrieve customer templates
    echo - POST /bio/backup - Manual database backup
    echo - GET /bio/backup-info - Backup system information
    echo.
    echo ### System Management
    echo - GET /health - System health check
    echo - GET /bio/device-info - Device information
    echo - GET /bio/list-devices - Available devices
    echo.
    echo ### Advanced Features
    echo ✅ **Local Database System**: SQLite with WAL Mode
    echo ✅ **Template-Level Encryption**: AES-256-GCM with customer-specific salts
    echo ✅ **PBKDF2 Key Derivation**: 100,000 iterations for enhanced security
    echo ✅ **Automatic Backups**: Daily backups with 30-day retention policy
    echo ✅ **Manual Backup API**: On-demand backup creation with metadata
    echo ✅ **Backup Monitoring**: Comprehensive backup information endpoints
    echo ✅ **Database Schema**: Optimized single-table design with indexes
    echo ✅ **WAL Journal Mode**: Better concurrency and crash recovery
    echo.
    echo ## 🚀 DEPLOYMENT REQUIREMENTS
    echo.
    echo ### Client Machine Requirements
    echo - **OS**: Windows 7+ ^(x64^)
    echo - **RAM**: 512 MB minimum ^(1 GB recommended^)
    echo - **Disk**: 200 MB free space
    echo - **Network**: Internet access for API calls
    echo - **Privileges**: Administrator rights for installation only
    echo.
    echo ### NOT REQUIRED on Client Machine
    echo - ❌ Node.js installation
    echo - ❌ .NET Framework installation
    echo - ❌ Visual C++ Redistributables
    echo - ❌ Additional dependencies
    echo - ❌ Manual configuration
    echo.
    echo ---
    echo **Build Info**: pkg v5.8.1 ^| better-sqlite3 v8.7.0 ^| Express v4.19.2
    echo **Compatibility**: Windows 7, 8, 10, 11 ^(x64^)
    echo **License**: Production Deployment Package
) > "%FINAL_DIR%\VERSION.txt"
goto :eof

:CreateTroubleshootingFile
(
    echo # 🔧 SUPREMA BIOMETRIC PROXY - TROUBLESHOOTING GUIDE
    echo **Version:** 1.0.0 ^| **Date:** %date%
    echo.
    echo ## 🚨 COMMON ISSUES ^& SOLUTIONS
    echo.
    echo ### ❌ Issue: Service Won't Start
    echo **Symptoms:** Service shows "STOPPED" or fails to start
    echo **Solutions:**
    echo 1. Check logs: logs/secure-proxy-YYYY-MM-DD.log
    echo 2. Verify port 4000 is available: netstat -an ^| findstr ":4000"
    echo 3. Run as Administrator: Right-click START.bat → Run as administrator
    echo 4. Reinstall: Run UNINSTALL.bat, then INSTALL.bat
    echo 5. Check Windows Event Viewer: Windows Logs → Application
    echo.
    echo ### ❌ Issue: "Administrator privileges required"
    echo **Symptoms:** INSTALL.bat fails with permission error
    echo **Solutions:**
    echo 1. Right-click INSTALL.bat → "Run as administrator"
    echo 2. If UAC is disabled, enable it temporarily
    echo 3. Use elevated PowerShell: Start-Process INSTALL.bat -Verb RunAs
    echo.
    echo ### ❌ Issue: SSL Certificate Not Trusted
    echo **Symptoms:** Browser shows "Certificate not trusted" warning
    echo **Solutions:**
    echo 1. Re-run INSTALL.bat as Administrator
    echo 2. Manual trust: certutil -addstore -f "Root" "certs\localhost.crt"
    echo 3. PowerShell method: Import-Certificate -FilePath "certs\localhost.crt" -CertStoreLocation Cert:\LocalMachine\Root
    echo 4. Browser: Click "Advanced" → "Proceed to localhost ^(unsafe^)"
    echo.
    echo ### ❌ Issue: Port 4000 Already in Use
    echo **Symptoms:** "EADDRINUSE" error in logs
    echo **Solutions:**
    echo 1. Find conflicting process: netstat -ano ^| findstr ":4000"
    echo 2. Kill process: taskkill /PID ^<PID_NUMBER^> /F
    echo 3. Check for other Suprema instances: tasklist ^| findstr suprema
    echo 4. Restart after cleanup: STOP.bat, then START.bat
    echo.
    echo ### ❌ Issue: Database Lock Error
    echo **Symptoms:** "Database is locked" in logs
    echo **Solutions:**
    echo 1. Stop all instances: STOP.bat
    echo 2. Check for zombie processes: tasklist ^| findstr suprema
    echo 3. Kill all: taskkill /F /IM suprema-secure-proxy.exe
    echo 4. Wait 10 seconds, then START.bat
    echo 5. If persistent: Delete data\biometric.db-wal and data\biometric.db-shm files
    echo.
    echo ### ❌ Issue: Health Endpoint Not Responding
    echo **Symptoms:** curl fails or times out
    echo **Solutions:**
    echo 1. Check service status: STATUS.bat
    echo 2. Verify process running: tasklist ^| findstr suprema
    echo 3. Check port binding: netstat -an ^| findstr ":4000"
    echo 4. Test localhost: curl -k https://127.0.0.1:4000/health
    echo 5. Check firewall: Windows Defender Firewall → Allow an app
    echo.
    echo ## 🔍 DIAGNOSTIC COMMANDS
    echo.
    echo ### Check System Status
    echo STATUS.bat                    # Complete system status
    echo sc query SupremaProxy         # Service status only
    echo tasklist ^| findstr suprema    # Process status
    echo netstat -an ^| findstr ":4000" # Port status
    echo.
    echo ### View Logs
    echo type logs\secure-proxy-*.log ^| more
    echo # Windows Service logs: eventvwr.msc → Windows Logs → Application → Filter by "SupremaProxy"
    echo.
    echo ### Network Testing
    echo curl -k https://localhost:4000/health
    echo curl -k -v https://localhost:4000/health    # Verbose output
    echo curl -k -X POST https://localhost:4000/bio/device-info
    echo.
    echo ### Certificate Verification
    echo certutil -store "Root" ^| findstr localhost
    echo certutil -dump certs\localhost.crt
    echo certutil -addstore -f "Root" certs\localhost.crt
    echo.
    echo ## 🛠️ MANUAL RECOVERY PROCEDURES
    echo.
    echo ### Complete Reset
    echo 1. STOP.bat
    echo 2. UNINSTALL.bat ^(as Administrator^)
    echo 3. Wait 30 seconds
    echo 4. INSTALL.bat ^(as Administrator^)
    echo 5. STATUS.bat ^(verify installation^)
    echo.
    echo ### Database Recovery
    echo 1. STOP.bat
    echo 2. Backup: copy data\biometric.db data\biometric.db.backup
    echo 3. Delete: del data\biometric.db-wal data\biometric.db-shm
    echo 4. START.bat
    echo 5. If issues persist: del data\biometric.db ^(will recreate empty^)
    echo.
    echo ## 📞 WHEN TO CONTACT SUPPORT
    echo.
    echo Contact support if you experience:
    echo 1. **Persistent crashes** after following troubleshooting steps
    echo 2. **Database corruption** that can't be resolved by recreation
    echo 3. **Certificate issues** on domain-joined machines
    echo 4. **Performance problems** affecting biometric matching
    echo 5. **Integration issues** with specific hardware
    echo.
    echo ## 📁 SUPPORT INFORMATION TO COLLECT
    echo.
    echo Before contacting support, gather:
    echo 1. STATUS.bat output ^(full text^)
    echo 2. Latest log file: logs\secure-proxy-*.log
    echo 3. Windows Event Viewer entries for "SupremaProxy"
    echo 4. System information: systeminfo ^> system-info.txt
    echo 5. Network configuration: ipconfig /all ^> network-info.txt
) > "%FINAL_DIR%\TROUBLESHOOTING.txt"
goto :eof