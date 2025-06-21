# PowerShell script to create a Windows Task Scheduler entry for Suprema Proxy
# Run as Administrator

param(
    [string]$TaskName = "SupremaProxyService",
    [string]$ExePath = "$PSScriptRoot\..\dist\suprema-proxy.exe",
    [string]$Description = "Suprema Biometric Proxy Server - Auto Restart Task"
)

Write-Host "Creating Windows Task Scheduler entry for Suprema Proxy..." -ForegroundColor Green

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
    # Delete existing task if it exists
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Removing existing task..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }

    # Create task action
    $Action = New-ScheduledTaskAction -Execute $ExePath

    # Create task trigger (at startup)
    $Trigger = New-ScheduledTaskTrigger -AtStartup

    # Create task settings
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)

    # Create task principal (run as SYSTEM with highest privileges)
    $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

    # Register the task
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description $Description

    # Verify task creation
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "✅ Task created successfully!" -ForegroundColor Green
        Write-Host "Task Name: $TaskName" -ForegroundColor White
        Write-Host "State: $($task.State)" -ForegroundColor White
        Write-Host "Trigger: At Startup" -ForegroundColor White
        Write-Host "Auto-restart: Yes (every minute if failed)" -ForegroundColor White
        
        # Start the task immediately
        Write-Host "Starting task..." -ForegroundColor Cyan
        Start-ScheduledTask -TaskName $TaskName
        
        Start-Sleep -Seconds 3
        
        # Check if proxy is responding
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Proxy server is responding at http://localhost:4000" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️ Proxy server may not be responding yet. Check task status." -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ Failed to create task" -ForegroundColor Red
    }

} catch {
    Write-Host "❌ Error creating scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Task Management Commands:" -ForegroundColor Cyan
Write-Host "  Start:   Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "  Stop:    Stop-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "  Status:  Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "  Remove:  Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
