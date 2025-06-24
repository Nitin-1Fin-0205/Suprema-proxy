# Suprema Secure Proxy - Final Package Creator
# This PowerShell script creates a complete, ready-to-distribute installer package

param(
    [string]$OutputPath = ".\suprema-secure-proxy-installer.zip"
)

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host " Suprema Secure Proxy Packager" -ForegroundColor Green  
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

$DeploymentDir = $PSScriptRoot
$TempPackageDir = Join-Path $env:TEMP "suprema-secure-proxy-package"

# Clean temp directory
if (Test-Path $TempPackageDir) {
    Write-Host "Cleaning temporary directory..." -ForegroundColor Yellow
    Remove-Item $TempPackageDir -Recurse -Force
}

# Create temp package directory
Write-Host "Creating package structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $TempPackageDir -Force | Out-Null

# Copy all required files
Write-Host "Copying deployment files..." -ForegroundColor Yellow
$filesToCopy = @(
    "suprema-secure-proxy.exe",
    "localhost.crt", 
    "localhost.key",
    "install.bat",
    "install.ps1", 
    "uninstall.bat",
    "status.bat",
    "README.txt"
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $DeploymentDir $file
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $TempPackageDir -Force
        Write-Host "  + $file" -ForegroundColor Green
    } else {
        Write-Host "  - $file (MISSING)" -ForegroundColor Red
    }
}

# Create main installer script
Write-Host "Creating main installer..." -ForegroundColor Yellow
$mainInstallerContent = @'
@echo off
REM Suprema Secure Proxy - One-Click Installer
REM Double-click this file to install the proxy

echo.
echo =============================================
echo  SUPREMA SECURE PROXY - ONE-CLICK INSTALLER
echo =============================================
echo.
echo This installer will:
echo - Install the Suprema Secure Proxy as a Windows service
echo - Configure SSL certificates  
echo - Set up firewall rules
echo - Start the service automatically
echo.
echo Requirements:
echo - Administrator privileges (will prompt if needed)
echo - Node.js installed
echo - Port 3443 available
echo.
echo Press any key to start installation...
pause >nul

REM Check for administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo Requesting administrator privileges...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

REM Run the actual installer
call install.bat
'@

$mainInstallerContent | Out-File -FilePath (Join-Path $TempPackageDir "INSTALL-PROXY.bat") -Encoding ASCII

# Create the ZIP package
Write-Host "Creating ZIP package..." -ForegroundColor Yellow
if (Test-Path $OutputPath) {
    Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
}

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($TempPackageDir, $OutputPath)
    Write-Host "Package created successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error creating ZIP: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Clean up temp directory
Remove-Item $TempPackageDir -Recurse -Force

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host " PACKAGING COMPLETE!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package: $OutputPath" -ForegroundColor Cyan
Write-Host "Contents:" -ForegroundColor Cyan

# List ZIP contents
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($OutputPath)
foreach ($entry in $zip.Entries) {
    Write-Host "  - $($entry.Name)" -ForegroundColor White
}
$zip.Dispose()

Write-Host ""
Write-Host "DISTRIBUTION INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Send the ZIP file to clients" -ForegroundColor White
Write-Host "2. Client extracts the ZIP" -ForegroundColor White  
Write-Host "3. Client runs 'INSTALL-PROXY.bat' as Administrator" -ForegroundColor White
Write-Host "4. Installation completes automatically" -ForegroundColor White
Write-Host ""
Write-Host "The proxy will be available at: https://localhost:3443" -ForegroundColor Cyan
Write-Host ""
