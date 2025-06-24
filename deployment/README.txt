SUPREMA SECURE PROXY
===================

This package contains everything needed to install and run the Suprema Secure Proxy
as a Windows service.

WHAT'S INCLUDED
---------------
- suprema-secure-proxy.exe    - Main proxy application
- localhost.crt               - SSL certificate for HTTPS
- localhost.key               - SSL private key
- install.bat                 - Windows service installer (Batch)
- install.ps1                 - Windows service installer (PowerShell) 
- uninstall.bat               - Service uninstaller
- status.bat                  - Service status checker
- README.txt                  - This file

SYSTEM REQUIREMENTS
-------------------
- Windows 10 or Windows Server 2016 or later
- Node.js (any recent version) installed and in PATH
- Administrator privileges for installation
- Port 3443 available (will be configured automatically)

QUICK INSTALLATION
------------------
1. Extract all files to a temporary directory
2. Right-click on "install.bat" and select "Run as administrator"
   OR
   Open PowerShell as administrator and run ".\install.ps1"
3. Follow the on-screen prompts
4. Test the installation by visiting https://localhost:3443/health

The installer will:
- Install the proxy as a Windows service
- Copy files to C:\Program Files\Suprema Secure Proxy
- Install and trust the SSL certificate
- Configure Windows Firewall
- Start the service automatically

WHAT THE PROXY DOES
-------------------
The Suprema Secure Proxy acts as a secure HTTPS gateway for biometric device
communication. It:

- Listens on port 3443 (HTTPS)
- Forwards requests to the local Suprema biometric service (port 8084)
- Handles SSL/TLS termination with self-signed certificates
- Manages session cookies and cross-origin requests
- Provides health check endpoint at /health
- Logs all activity for troubleshooting

USAGE
-----
Once installed, the proxy runs automatically as a Windows service.

Health Check:    https://localhost:3443/health
API Endpoints:   https://localhost:3443/api/*

The proxy forwards all /api/* requests to the local biometric service
at http://127.0.0.1:8084/api/*

MANAGEMENT COMMANDS
-------------------
Check Status:    Run status.bat
Start Service:   sc start SupremaSecureProxy
Stop Service:    sc stop SupremaSecureProxy  
Restart Service: sc stop SupremaSecureProxy && sc start SupremaSecureProxy
View Logs:       Check C:\Program Files\Suprema Secure Proxy\logs\

UNINSTALLATION
--------------
To completely remove the proxy:
1. Right-click on "uninstall.bat" and select "Run as administrator"
2. The uninstaller will stop the service, remove files, and clean up certificates

TROUBLESHOOTING
---------------
If the proxy doesn't start:
1. Run status.bat to check the service status
2. Verify Node.js is installed: node --version
3. Check Windows Event Viewer for service errors
4. Check log files in the installation directory

If SSL certificate warnings appear:
- The proxy uses self-signed certificates for local development
- The installer attempts to trust the certificate automatically
- You may need to manually accept the certificate in your browser

SUPPORT
-------
For issues or questions, check the log files first:
C:\Program Files\Suprema Secure Proxy\logs\secure-proxy-*.log

Common issues:
- Port 3443 already in use: Stop other services using this port
- Service won't start: Check Node.js installation and file permissions
- SSL errors: Manually trust the certificate in Windows Certificate Store

CONFIGURATION
-------------
The proxy is pre-configured for standard setups:
- HTTPS Port: 3443
- Backend: http://127.0.0.1:8084
- Certificates: Self-signed for localhost
- Logging: Enabled with daily rotation

No configuration changes are typically needed.

FILES AND DIRECTORIES
---------------------
After installation, files are located at:
C:\Program Files\Suprema Secure Proxy\
├── suprema-secure-proxy.exe    (Main application)
├── localhost.crt               (SSL certificate)
├── localhost.key               (SSL private key)
└── logs\                       (Log files)
    ├── secure-proxy-YYYY-MM-DD.log
    └── ...

SECURITY NOTES
--------------
- The proxy uses self-signed SSL certificates
- It only accepts connections on localhost/127.0.0.1
- All traffic to the biometric service is proxied securely
- Session handling preserves authentication state
- Firewall rules are added automatically for port 3443

VERSION HISTORY
---------------
This deployment package contains the production-ready version of the
Suprema Secure Proxy with all necessary components for enterprise deployment.
