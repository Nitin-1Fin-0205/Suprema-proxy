# start-secure-proxy-background.ps1 - Start Secure Proxy in Background

param(
    [switch]$AddToStartup,
    [switch]$RemoveFromStartup
)

$ExePath = "$PSScriptRoot\..\dist\suprema-secure-proxy.exe"
$ProcessName = "suprema-secure-proxy"
$StartupRegPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
$StartupEntryName = "SupremaSecureProxy"

Write-Host "Suprema Secure Proxy Background Starter" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

if ($RemoveFromStartup) {
    Write-Host "Removing from Windows startup..." -ForegroundColor Yellow
    try {
        Remove-ItemProperty -Path $StartupRegPath -Name $StartupEntryName -ErrorAction SilentlyContinue
        Write-Host "✅ Removed from Windows startup" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Could not remove from startup (may not exist)" -ForegroundColor Yellow
    }
    exit 0
}

# Check if already running
$existingProcess = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "✅ Secure proxy is already running (PID: $($existingProcess.Id))" -ForegroundColor Green
    Write-Host "URL: https://localhost:4000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To stop: taskkill /IM $ProcessName.exe /F" -ForegroundColor Gray
    exit 0
}

# Check if EXE exists
if (-not (Test-Path $ExePath)) {
    Write-Host "❌ EXE not found: $ExePath" -ForegroundColor Red
    Write-Host "Build it first: npm run build-secure" -ForegroundColor Yellow
    exit 1
}

# Start the proxy in background
Write-Host "Starting secure HTTPS proxy in background..." -ForegroundColor Green
try {
    Start-Process -FilePath $ExePath -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    # Verify it started
    $newProcess = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($newProcess) {
        Write-Host "✅ Secure proxy started successfully!" -ForegroundColor Green
        Write-Host "   PID: $($newProcess.Id)" -ForegroundColor White
        Write-Host "   URL: https://localhost:4000" -ForegroundColor Cyan
        Write-Host "   Health: https://localhost:4000/health" -ForegroundColor Cyan
        
        # Test health endpoint
        Write-Host ""
        Write-Host "Testing proxy health..." -ForegroundColor Yellow
        try {
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
            $response = Invoke-WebRequest -Uri "https://localhost:4000/health" -UseBasicParsing -TimeoutSec 10
            $healthData = $response.Content | ConvertFrom-Json
            Write-Host "✅ Health check passed!" -ForegroundColor Green
            Write-Host "   Server: $($healthData.server)" -ForegroundColor White
            Write-Host "   Status: $($healthData.status)" -ForegroundColor White
        } catch {
            Write-Host "⚠️ Proxy started but health check failed (may still be initializing)" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ Failed to start proxy process" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Error starting proxy: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Add to startup if requested
if ($AddToStartup) {
    Write-Host ""
    Write-Host "Adding to Windows startup..." -ForegroundColor Yellow
    
    if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
        Write-Host "⚠️ Administrator privileges required for startup registration" -ForegroundColor Yellow
        Write-Host "   Run as Administrator and use -AddToStartup flag" -ForegroundColor Gray
    } else {
        try {
            $startupCommand = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`""
            Set-ItemProperty -Path $StartupRegPath -Name $StartupEntryName -Value $startupCommand
            Write-Host "✅ Added to Windows startup" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to add to startup: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "🎉 Secure HTTPS proxy is running in background!" -ForegroundColor Green
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  Stop:     taskkill /IM $ProcessName.exe /F" -ForegroundColor White
Write-Host "  Restart:  powershell -File `"$PSCommandPath`"" -ForegroundColor White
Write-Host "  Status:   Get-Process -Name $ProcessName" -ForegroundColor White
Write-Host ""
Write-Host "Auto-Startup:" -ForegroundColor Yellow
Write-Host "  Add:      powershell -File `"$PSCommandPath`" -AddToStartup" -ForegroundColor White
Write-Host "  Remove:   powershell -File `"$PSCommandPath`" -RemoveFromStartup" -ForegroundColor White
