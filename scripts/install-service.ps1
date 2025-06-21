# PowerShell script to install Suprema Proxy as Windows Service
# Run as Administrator

param(
    [string]$ServiceName = "SupremaProxy",
    [string]$DisplayName = "Suprema Biometric Proxy Server",
    [string]$Description = "Proxy server for Suprema biometric device communication",
    [string]$ExePath = "$PSScriptRoot\..\dist\suprema-proxy.exe"
)

Write-Host "Installing Suprema Proxy as Windows Service..." -ForegroundColor Green

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
    # Stop service if it exists
    $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Host "Stopping existing service..." -ForegroundColor Yellow
        Stop-Service -Name $ServiceName -Force
        sc.exe delete $ServiceName
        Start-Sleep -Seconds 2
    }

    # Create the service
    Write-Host "Creating Windows Service..." -ForegroundColor Cyan
    New-Service -Name $ServiceName `
                -BinaryPathName $ExePath `
                -DisplayName $DisplayName `
                -Description $Description `
                -StartupType Automatic

    # Set service to restart on failure
    sc.exe failure $ServiceName reset= 0 actions= restart/5000/restart/10000/restart/30000

    # Start the service
    Write-Host "Starting service..." -ForegroundColor Cyan
    Start-Service -Name $ServiceName

    # Verify service status
    $service = Get-Service -Name $ServiceName
    if ($service.Status -eq "Running") {
        Write-Host "✅ Service installed and started successfully!" -ForegroundColor Green
        Write-Host "Service Name: $ServiceName" -ForegroundColor White
        Write-Host "Status: $($service.Status)" -ForegroundColor White
        Write-Host "Startup Type: Automatic" -ForegroundColor White
    } else {
        Write-Host "❌ Service installed but failed to start. Status: $($service.Status)" -ForegroundColor Red
    }

    # Test the proxy endpoint
    Start-Sleep -Seconds 3
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Proxy server is responding at http://localhost:4000" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Proxy server may not be responding yet. Check logs in the application directory." -ForegroundColor Yellow
    }

} catch {
    Write-Host "❌ Error installing service: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Service Management Commands:" -ForegroundColor Cyan
Write-Host "  Start:   Start-Service -Name '$ServiceName'" -ForegroundColor White
Write-Host "  Stop:    Stop-Service -Name '$ServiceName'" -ForegroundColor White
Write-Host "  Status:  Get-Service -Name '$ServiceName'" -ForegroundColor White
Write-Host "  Remove:  sc.exe delete '$ServiceName'" -ForegroundColor White
