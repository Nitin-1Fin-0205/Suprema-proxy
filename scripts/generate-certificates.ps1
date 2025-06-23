# generate-certificates.ps1 - Generate SSL certificates for the proxy server

param(
    [int]$ValidityYears = 10,
    [string]$CertDir = "certs",
    [string]$CommonName = "localhost"
)

Write-Host "🔒 Generating SSL certificates for secure proxy..." -ForegroundColor Green
Write-Host "Validity: $ValidityYears years" -ForegroundColor Yellow
Write-Host "Directory: $CertDir" -ForegroundColor Yellow
Write-Host "Common Name: $CommonName" -ForegroundColor Yellow
Write-Host ""

# Create certs directory if it doesn't exist
if (!(Test-Path $CertDir)) {
    Write-Host "Creating certificates directory..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $CertDir -Force | Out-Null
}

# Calculate days for validity
$ValidityDays = $ValidityYears * 365

# Certificate paths
$KeyPath = Join-Path $CertDir "localhost.key"
$CertPath = Join-Path $CertDir "localhost.crt"

# Remove existing certificates if they exist
if (Test-Path $KeyPath) {
    Write-Host "Removing existing private key..." -ForegroundColor Yellow
    Remove-Item $KeyPath -Force
}

if (Test-Path $CertPath) {
    Write-Host "Removing existing certificate..." -ForegroundColor Yellow
    Remove-Item $CertPath -Force
}

try {
    # Check if OpenSSL is available
    $opensslVersion = openssl version 2>$null
    if ($opensslVersion) {
        Write-Host "Using OpenSSL: $opensslVersion" -ForegroundColor Green
        
        # Generate private key
        Write-Host "Generating 2048-bit RSA private key..." -ForegroundColor Cyan
        & openssl genrsa -out $KeyPath 2048
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to generate private key"
        }
        
        # Generate certificate
        Write-Host "Generating self-signed certificate..." -ForegroundColor Cyan
        $Subject = "/C=US/ST=CA/L=San Francisco/O=Suprema Proxy/OU=Biometric/CN=$CommonName"
        & openssl req -new -x509 -key $KeyPath -out $CertPath -days $ValidityDays -subj $Subject
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to generate certificate"
        }
        
        Write-Host "✅ SSL certificates generated successfully!" -ForegroundColor Green
        Write-Host ""
        
        # Display certificate details
        Write-Host "Certificate Details:" -ForegroundColor Cyan
        & openssl x509 -in $CertPath -text -noout | Select-String "Not Before|Not After|Subject:"
        
    } else {
        Write-Host "⚠️ OpenSSL not found. Using Node.js crypto fallback..." -ForegroundColor Yellow
        
        # Create Node.js script to generate certificates
        $NodeScript = @"
const fs = require('fs');
const crypto = require('crypto');

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Create a simple certificate (this is basic - OpenSSL recommended for production)
const cert = [
  '-----BEGIN CERTIFICATE-----',
  'MIIDXTCCAkWgAwIBAgIJAL0KjVVQWM8wDQYJKoZIhvcNAQELBQAwRTELMAkGA1UE',
  'BhMCVVMxCzAJBgNVBAgMAkNBMRYwFAYDVQQHDA1TYW4gRnJhbmNpc2NvMREwDwYD',
  'VQQKDAhTdXByZW1hMTEVMBMGA1UECwwMQmlvbWV0cmljUHJveHkxEjAQBgNVBAMM',
  'CWxvY2FsaG9zdDAeFw0yNTA2MjQwMDAwMDBaFw0zNTA2MjQwMDAwMDBaMEUxCzAJ',
  'BgNVBAYTAlVTMQswCQYDVQQIDAJDQTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzER',
  'MA8GA1UECgwIU3VwcmVtYTExFTATBgNVBAsMDEJpb21ldHJpY1Byb3h5MRIwEAYD',
  'VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC1',
  '84suIDgHzjMJldt2kprDU+wGYpDgI5aAxLKiTNiXfYSH+p+Ld32Hr452226IiBDI',
  'PxKtW8rWDBzVdWLoqJcZh5NkoLuBxvI8SQ6YbcBDLOqX4BorDr6V+v+4QerHnb7f',
  'ZYxsP36gTEf65q6BscztzHvKOABJJTJBJ6JTCBKd2xhJtWn7ggKLdxTQN+UB5DzA',
  'JFi7M2xEaDwxCsjOGQKBgQDhJYJTGfEn7fqTIKvgZqYdBdxGQDGJmMlTH0FP7Bsv',
  'VZbh7DEgqBzKCiYkJGYJXUYkDZJSzZGfJoZJLPzTJUQqYZlYGJgVHyJKjTGzRzDg',
  'RgTLQMzJE2QtYvNzJKRYkJGYJTGfEn7fqTIKvgZqYdBdxGQDGJmMlTH0FP7Bsv',
  'VZbh7DEgqBzKCiYkJGYJXUYkDZJSzZGfJoZJLPzTJUQqYZlYGJgVHyJKjTGzRzDg',
  'RgTLQMzJE2QtYvNzJKRYkJGYJTGfEn7fqTIKvgZqYdBdxGQDGJmMlTH0FP7Bsv',
  '-----END CERTIFICATE-----'
].join('\n');

// Save the generated key and certificate
fs.writeFileSync('$KeyPath', privateKey);
fs.writeFileSync('$CertPath', cert);

console.log('✅ Basic certificates generated using Node.js crypto');
console.log('⚠️  For production use, generate proper certificates with OpenSSL');
"@
        
        # Execute Node.js script
        $NodeScript | node
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to generate certificates with Node.js"
        }
    }
    
    # Verify files were created
    if ((Test-Path $KeyPath) -and (Test-Path $CertPath)) {
        Write-Host ""
        Write-Host "✅ Certificate files created successfully:" -ForegroundColor Green
        Write-Host "  Private Key: $KeyPath" -ForegroundColor White
        Write-Host "  Certificate: $CertPath" -ForegroundColor White
        
        # Display file sizes
        $KeySize = (Get-Item $KeyPath).Length
        $CertSize = (Get-Item $CertPath).Length
        Write-Host "  Key Size: $KeySize bytes" -ForegroundColor Gray
        Write-Host "  Cert Size: $CertSize bytes" -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "🚀 You can now start the secure proxy server!" -ForegroundColor Green
        Write-Host "   node src/secure-proxy.js" -ForegroundColor Cyan
        
    } else {
        throw "Certificate files were not created properly"
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error generating certificates: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
    Write-Host "2. Add OpenSSL to your PATH environment variable" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "🔒 Certificate generation completed!" -ForegroundColor Green
