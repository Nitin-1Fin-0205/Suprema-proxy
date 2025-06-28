# Suprema Biometric Proxy - Production Deployment
# Version: 1.0.0
# Date: June 27, 2025

## 🚀 QUICK SETUP GUIDE

This is a production-ready biometric proxy server with automatic startup capabilities.

### ⚡ INSTANT SETUP (3 Steps)

1. **Extract** this folder to: `C:\SupremaProxy\`
2. **Run as Administrator**: `INSTALL.bat`
3. **Done!** The service will start automatically

### 📋 WHAT'S INCLUDED

```
SupremaProxy/
├── suprema-secure-proxy.exe    # Main application (standalone)
├── INSTALL.bat                 # One-click installer
├── UNINSTALL.bat              # One-click uninstaller
├── START.bat                  # Manual start
├── STOP.bat                   # Manual stop
├── STATUS.bat                 # Check status
├── certs/                     # SSL certificates
│   ├── localhost.crt          # Certificate file
│   └── localhost.key          # Private key
├── logs/                      # Application logs
└── README.txt                 # This file
```

### 🔧 INSTALLATION

**Run as Administrator:**
```cmd
INSTALL.bat
```

This will:
✅ Install Windows Service (auto-start on boot)
✅ Add registry startup entry (backup)
✅ Create scheduled task (failsafe)
✅ Trust SSL certificate (eliminate browser warnings)
✅ Start the service immediately

### 🌐 ACCESS URLS

After installation, access the service at:
- **HTTPS**: https://localhost:4000
- **Health Check**: https://localhost:4000/health
- **Biometric API**: https://localhost:4000/bio/identify-fingerprint

### 🛠️ MANAGEMENT

```cmd
STATUS.bat      # Check if running
START.bat       # Start service
STOP.bat        # Stop service
UNINSTALL.bat   # Remove completely
```

### ⭐ FEATURES

✅ **Auto-Start**: Starts automatically when PC boots
✅ **Self-Healing**: Restarts automatically if crashed
✅ **No Dependencies**: Standalone executable
✅ **Secure HTTPS**: Trusted SSL certificates
✅ **Production Logs**: Detailed logging for troubleshooting
✅ **Easy Management**: Simple batch file controls

### 🔧 TROUBLESHOOTING

**Service won't start?**
1. Check Windows Event Viewer
2. Run STATUS.bat to see current state
3. Check logs/ folder for error details

**Browser shows security warning?**
1. Run INSTALL.bat as Administrator (it auto-trusts certificates)
2. Or manually trust: Double-click certs/localhost.crt → Install Certificate

**Port 4000 in use?**
1. Check what's using port: `netstat -ano | findstr :4000`
2. Stop conflicting service

### 📞 SUPPORT

- **Health Check**: https://localhost:4000/health
- **Logs Location**: logs/secure-proxy-YYYY-MM-DD.log
- **Service Name**: SupremaProxy

---

**🎯 Ready for Production Use - Deploy Anywhere!**
