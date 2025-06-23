# Suprema Secure HTTPS Proxy - Clean Setup Guide

A production-ready HTTPS proxy for Suprema biometric devices with self-signed certificates.

## 🚀 Quick Start (3 Steps)

### 1. Build the Proxy
```bash
npm run build-secure
```
This creates `dist/suprema-secure-proxy.exe` - a standalone executable.

### 2. Start the Proxy
```bash
npm run start
```
The proxy will:
- Generate 10-year self-signed certificates automatically
- Start HTTPS server on port 4000
- Run in the background

### 3. Access the Proxy
- **Main URL**: https://localhost:4000
- **Health Check**: https://localhost:4000/health

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run build-secure` | Build the standalone EXE |
| `npm run start` | Start proxy in background |
| `npm run stop` | Stop the proxy |
| `npm run restart` | Restart the proxy |
| `npm run status` | Check if proxy is running |
| `npm run trust-cert` | Trust the SSL certificate (requires admin) |

## 🔧 Management

### Check Status
```bash
npm run status
```

### Stop Proxy
```bash
npm run stop
```

### Restart Proxy
```bash
npm run restart
```

## 📁 File Structure

```
suprema-proxy/
├── dist/
│   └── suprema-secure-proxy.exe    # Standalone executable
├── certs/
│   ├── localhost.crt               # SSL certificate (auto-generated)
│   └── localhost.key               # SSL private key (auto-generated)
├── logs/
│   └── secure-proxy-YYYY-MM-DD.log # Daily log files
└── src/
    └── secure-proxy.js             # Source code
```

## 🛡️ Security Features

- **10-year self-signed certificates** (auto-generated)
- **Automatic certificate trust** (when run as administrator)
- **CORS protection** with allowed origins
- **Request/response logging**
- **Error handling and recovery**

## 🚨 Troubleshooting

### Proxy Won't Start
1. Check if port 4000 is in use: `netstat -ano | findstr :4000`
2. Kill conflicting process: `taskkill /PID <PID> /F`
3. Restart: `npm run restart`

### Certificate Warnings in Browser
1. Run as administrator: `npm run trust-cert`
2. Or manually accept the browser warning (one-time)

### Can't Access HTTPS
1. Ensure proxy is running: `npm run status`
2. Check firewall settings for port 4000
3. Try HTTP first: http://localhost:4000/health

## 📦 Deployment

The `dist/suprema-secure-proxy.exe` is a standalone file that can be:
- Copied to any Windows machine
- Run without Node.js installed
- Started automatically on system boot

## 🔄 Auto-Startup (Optional)

To start automatically with Windows:
1. Press `Win + R`, type `shell:startup`
2. Create shortcut to `suprema-secure-proxy.exe`
3. Or use Task Scheduler for service-like behavior

## 📝 Configuration

Default settings in `src/secure-proxy.js`:
- **Port**: 4000
- **Target**: http://localhost:8084
- **Allowed Origins**: Various localhost ports

## 💡 Tips

- **No Admin Required**: The proxy runs without administrator privileges
- **Portable**: Single EXE file, no installation needed
- **Logging**: Check `logs/` folder for troubleshooting
- **Performance**: Low memory usage (~40MB)

---

## 🎯 Production Checklist

- [ ] Build the EXE: `npm run build-secure`
- [ ] Test locally: `npm run start`
- [ ] Verify HTTPS: https://localhost:4000/health
- [ ] Trust certificate: `npm run trust-cert` (optional)
- [ ] Copy EXE to production machine
- [ ] Set up auto-startup (optional)

**That's it! Your secure HTTPS proxy is ready for production use.**
