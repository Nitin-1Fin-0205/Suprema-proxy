# trust-certificate.ps1 - Add self-signed certificate to Windows Trust Store

Write-Host "Adding self-signed certificate to Windows Trust Store..." -ForegroundColor Yellow
Write-Host "This will eliminate browser security warnings for localhost" -ForegroundColor Gray
Write-Host ""

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script requires Administrator privileges" -ForegroundColor Red
    Write-Host "Right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$CertPath = "certs\localhost.crt"

# Check if certificate file exists
if (-not (Test-Path $CertPath)) {
    Write-Host "ERROR: Certificate file not found: $CertPath" -ForegroundColor Red
    Write-Host "Run 'npm run generate-certs' first to create certificates" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    # Import certificate to Trusted Root Certification Authorities
    Write-Host "Importing certificate to Windows Trust Store..." -ForegroundColor Cyan
    
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $cert.Import((Resolve-Path $CertPath).Path)
    
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::Root, [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine)
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $store.Add($cert)
    $store.Close()

    Write-Host "SUCCESS: Certificate successfully added to Windows Trust Store!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Browser warnings should now be eliminated for:" -ForegroundColor Green
    Write-Host "   https://localhost:4000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "NOTE: You may need to restart your browser for changes to take effect" -ForegroundColor Yellow
    Write-Host ""
    
    # Display certificate details
    Write-Host "Certificate Details:" -ForegroundColor Gray
    Write-Host "  Subject: $($cert.Subject)" -ForegroundColor White
    Write-Host "  Issuer: $($cert.Issuer)" -ForegroundColor White
    Write-Host "  Valid From: $($cert.NotBefore)" -ForegroundColor White
    Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor White

} catch {
    Write-Host "ERROR: Failed to add certificate: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure you are running as Administrator" -ForegroundColor White
    Write-Host "2. Check if the certificate file exists and is valid" -ForegroundColor White
    Write-Host "3. Try regenerating certificates with: npm run generate-certs" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Setup complete! Your browser should no longer show warnings for localhost." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
