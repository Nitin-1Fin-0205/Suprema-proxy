# Suprema Secure Proxy Installer (PowerShell)
# This script installs the Suprema Secure Proxy as a Windows service

param(
    [switch]$Force = $false
)

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host " Suprema Secure Proxy Installer" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This installer must be run as Administrator." -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as administrator'" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Checking system requirements..." -ForegroundColor Yellow

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Set installation directory
$InstallDir = "C:\Program Files\Suprema Secure Proxy"
$ServiceName = "SupremaSecureProxy"

Write-Host ""
Write-Host "Installation directory: $InstallDir" -ForegroundColor Cyan

# Create installation directory
if (-not (Test-Path $InstallDir)) {
    Write-Host "Creating installation directory..." -ForegroundColor Yellow
    try {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    } catch {
        Write-Host "ERROR: Failed to create installation directory" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Copy files
Write-Host "Copying application files..." -ForegroundColor Yellow
try {
    Copy-Item "suprema-secure-proxy.exe" "$InstallDir\" -Force
    Copy-Item "localhost.crt" "$InstallDir\" -Force
    Copy-Item "localhost.key" "$InstallDir\" -Force
    
    if (-not (Test-Path "$InstallDir\logs")) {
        New-Item -ItemType Directory -Path "$InstallDir\logs" -Force | Out-Null
    }
} catch {
    Write-Host "ERROR: Failed to copy files" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install and trust the SSL certificate
Write-Host "Installing SSL certificate..." -ForegroundColor Yellow
try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("$InstallDir\localhost.crt")
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::Root, [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine)
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $store.Add($cert)
    $store.Close()
    Write-Host "SSL certificate installed successfully" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Failed to install SSL certificate automatically" -ForegroundColor Yellow
    Write-Host "You may need to manually trust the certificate" -ForegroundColor Yellow
}

# Install the service using NSSM (Non-Sucking Service Manager) approach
Write-Host "Installing Windows service..." -ForegroundColor Yellow

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService -and -not $Force) {
    Write-Host "Service $ServiceName already exists. Use -Force to reinstall." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
} elseif ($existingService) {
    Write-Host "Stopping and removing existing service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -ErrorAction SilentlyContinue
    & sc.exe delete $ServiceName
    Start-Sleep -Seconds 2
}

# Create the service
$exePath = "$InstallDir\suprema-secure-proxy.exe"
$serviceBinary = $exePath
$serviceArgs = ""

# Use New-Service to create the service
try {
    New-Service -Name $ServiceName -BinaryPathName "`"$serviceBinary`" $serviceArgs" -DisplayName "Suprema Secure Proxy" -Description "Suprema Secure Proxy Service" -StartupType Automatic
    Write-Host "Service created successfully" -ForegroundColor Green
    
    # Start the service
    Start-Service -Name $ServiceName
    Write-Host "Service started successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create or start service: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Add firewall rule
Write-Host "Adding firewall rule..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "Suprema Secure Proxy" -Direction Inbound -Protocol TCP -LocalPort 3443 -Action Allow -ErrorAction SilentlyContinue
    Write-Host "Firewall rule added successfully" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Failed to add firewall rule automatically" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host " Installation Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "Service: $ServiceName" -ForegroundColor Cyan
Write-Host "Port: 3443 (HTTPS)" -ForegroundColor Cyan
Write-Host "Installation: $InstallDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "The service should now be running." -ForegroundColor Green
Write-Host "You can check the status using: Get-Service $ServiceName" -ForegroundColor Yellow
Write-Host ""
Write-Host "To test the proxy, visit: https://localhost:3443/health" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
