# PowerShell script to add Suprema Proxy to Windows Startup Registry
# Run as Administrator

param(
    [string]$ExePath = "$PSScriptRoot\..\dist\suprema-proxy.exe",
    [string]$AppName = "SupremaProxy"
)

Write-Host "Adding Suprema Proxy to Windows Startup Registry..." -ForegroundColor Green

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script requires Administrator privileges. Please run as Administrator." -ForegroundColor Red
    exit 1
}

# Check if executable exists
if (-not (Test-Path $ExePath)) {
    Write-Host "Executable not found at: $ExePath" -ForegroundColor Red
    Write-Host "Please build the project first using: npm run build-win" -ForegroundColor Yellow
    exit 1
}

try {
    # Registry path for startup applications
    $StartupRegPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
    
    # Add to registry
    Set-ItemProperty -Path $StartupRegPath -Name $AppName -Value $ExePath
    
    Write-Host "✅ Successfully added to startup registry!" -ForegroundColor Green
    Write-Host "Registry Path: $StartupRegPath" -ForegroundColor White
    Write-Host "Entry Name: $AppName" -ForegroundColor White
    Write-Host "Executable: $ExePath" -ForegroundColor White
    
    # Verify the entry
    $registryValue = Get-ItemProperty -Path $StartupRegPath -Name $AppName -ErrorAction SilentlyContinue
    if ($registryValue) {
        Write-Host "✅ Registry entry verified!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to verify registry entry" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error adding to startup registry: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "The application will now start automatically when Windows boots." -ForegroundColor Cyan
Write-Host "To remove from startup, run: Remove-ItemProperty -Path '$StartupRegPath' -Name '$AppName'" -ForegroundColor Yellow
