# 🚀 SUPREMA BIOMETRIC PROXY - COMPLETE STANDALONE PACKAGE
**Version:** 1.0.0 | **Build Date:** 07-10-2025
**Package Type:** Production Ready - Zero Dependencies

## 📦 PACKAGE CONTENTS
✅ suprema-secure-proxy.exe - Main application (50MB+ standalone)
✅ MatcherCapture/ - .NET biometric engine with UFMatcher SDK
✅ certs/ - SSL certificates (auto-trusted during installation)
✅ Management scripts - INSTALL.bat, STATUS.bat, START.bat, STOP.bat, UNINSTALL.bat
✅ Complete documentation - README.txt, VERSION.txt, TROUBLESHOOTING.txt

## 🚀 QUICK INSTALLATION (3 STEPS)

1. **Extract** this package to C:\SupremaProxy\ (or any location)
2. **Right-click INSTALL.bat** → "Run as administrator"
3. **Done!** Service auto-starts and runs forever

## 🌐 ACCESS POINTS
- **Main Service**: https://localhost:4000
- **Health Check**: https://localhost:4000/health
- **API Documentation**: Integrated endpoints for biometric operations

## 🛠️ MANAGEMENT

| Script | Purpose | Admin Required |
|-----|-----|-----|
| INSTALL.bat | Install service + certificates | ✅ Yes |
| STATUS.bat | Check system status | ❌ No |
| START.bat | Start the service | ❌ No |
| STOP.bat | Stop the service | ❌ No |
| UNINSTALL.bat | Remove everything | ✅ Yes |

## ✅ FEATURES
- **Zero Dependencies**: No Node.js, .NET, or database installation required
- **Auto-Start Service**: Starts automatically when Windows boots
- **Encrypted Storage**: AES-256 encryption for biometric templates
- **Local Database**: SQLite with automatic backups
- **SSL Security**: Auto-trusted certificates eliminate browser warnings
- **Professional Logging**: Structured logs with daily rotation
- **Health Monitoring**: Built-in diagnostic endpoints

## 🔧 TROUBLESHOOTING

**Service won't start:**
1. Run STATUS.bat to diagnose
2. Check logs/ directory for error details
3. Ensure port 4000 is not in use
4. Re-run INSTALL.bat as administrator

**Browser security warnings:**
1. Certificate should auto-trust during installation
2. Manually trust: certutil -addstore -f "Root" certs\localhost.crt

**API not responding:**
1. Check STATUS.bat for service status
2. Verify firewall allows port 4000
3. Test: curl -k https://localhost:4000/health

For detailed troubleshooting, see TROUBLESHOOTING.txt
