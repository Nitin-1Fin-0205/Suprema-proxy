# Master Installation Script for Suprema Proxy
# This script will install the proxy using multiple methods for maximum reliability
# Run as Administrator

param(
    [switch]$Service,      # Install as Windows Service
    [switch]$Registry,     # Add to startup registry  
    [switch]$Task,         # Create scheduled task
    [switch]$All           # Install using all methods
)

$ErrorActionPreference = "Stop"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    Suprema Biometric Proxy Installer v1.0    " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ExePath = Join-Path $ProjectRoot "dist\suprema-proxy.exe"

Write-Host "Project Directory: $ProjectRoot" -ForegroundColor Gray
Write-Host "Executable Path: $ExePath" -ForegroundColor Gray
Write-Host ""

# Check if executable exists
if (-not (Test-Path $ExePath)) {
    Write-Host "❌ Executable not found at: $ExePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Building the executable now..." -ForegroundColor Yellow
    
    try {
        Set-Location $ProjectRoot
        
        # Check if npm is available
        $npmVersion = npm --version 2>$null
        if (-not $npmVersion) {
            Write-Host "❌ npm is not installed or not in PATH" -ForegroundColor Red
            Write-Host "Please install Node.js and npm first." -ForegroundColor Yellow
            Read-Host "Press Enter to exit"
            exit 1
        }
        
        Write-Host "Installing dependencies..." -ForegroundColor Cyan
        npm install
        
        Write-Host "Building Windows executable..." -ForegroundColor Cyan
        npm run build-win
        
        # Verify build
        if (Test-Path $ExePath) {
            Write-Host "✅ Build successful!" -ForegroundColor Green
        } else {
            Write-Host "❌ Build failed - executable not created" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
        
    } catch {
        Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Show menu if no parameters provided
if (-not ($Service -or $Registry -or $Task -or $All)) {
    Write-Host "Select installation method:" -ForegroundColor Yellow
    Write-Host "1. Windows Service (Recommended)" -ForegroundColor White
    Write-Host "2. Startup Registry Entry" -ForegroundColor White  
    Write-Host "3. Scheduled Task" -ForegroundColor White
    Write-Host "4. All Methods (Maximum Reliability)" -ForegroundColor White
    Write-Host ""
    
    do {
        $choice = Read-Host "Enter your choice (1-4)"
    } while ($choice -notmatch '^[1-4]$')
    
    switch ($choice) {
        "1" { $Service = $true }
        "2" { $Registry = $true }
        "3" { $Task = $true }
        "4" { $All = $true }
    }
}

# Set all methods if -All is specified
if ($All) {
    $Service = $true
    $Registry = $true
    $Task = $true
}

$successCount = 0
$totalMethods = 0

# Method 1: Windows Service
if ($Service) {
    $totalMethods++
    Write-Host ""
    Write-Host "🔧 Installing as Windows Service..." -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    try {
        & "$ScriptDir\install-service.ps1"
        $successCount++
        Write-Host "✅ Windows Service installation completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Windows Service installation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Method 2: Registry Startup
if ($Registry) {
    $totalMethods++
    Write-Host ""
    Write-Host "🔧 Adding to Startup Registry..." -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    try {
        & "$ScriptDir\add-to-startup.ps1"
        $successCount++
        Write-Host "✅ Registry startup entry completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Registry startup entry failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Method 3: Scheduled Task
if ($Task) {
    $totalMethods++
    Write-Host ""
    Write-Host "🔧 Creating Scheduled Task..." -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    try {
        & "$ScriptDir\create-task.ps1"
        $successCount++
        Write-Host "✅ Scheduled Task creation completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Scheduled Task creation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final verification
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "           Installation Summary                " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host "Methods attempted: $totalMethods" -ForegroundColor White
Write-Host "Successful installs: $successCount" -ForegroundColor White

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "✅ Installation completed successfully!" -ForegroundColor Green
    Write-Host "The Suprema Proxy will now start automatically." -ForegroundColor Green
    
    # Test the service
    Write-Host ""
    Write-Host "Testing proxy connection..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 15
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Proxy server is running and responding at http://localhost:4000" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Proxy server may still be starting up. Please wait a moment and check manually." -ForegroundColor Yellow
    }
    
} else {
    Write-Host ""
    Write-Host "❌ All installation methods failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installation logs are available in the project logs directory." -ForegroundColor Gray
Write-Host "Proxy server logs will be created in: $ProjectRoot\logs\" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
