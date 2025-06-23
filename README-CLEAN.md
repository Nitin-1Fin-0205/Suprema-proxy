# Suprema Secure HTTPS Proxy

A simple, secure HTTPS proxy for Suprema biometric devices with automatic SSL certificates.

## 🚀 Quick Start

```bash
# 1. Build the proxy
npm run build-secure

# 2. Start the proxy
npm run start

# 3. Access at https://localhost:4000
```

## 📋 Commands

- `npm run build-secure` - Build standalone EXE
- `npm run start` - Start proxy in background  
- `npm run stop` - Stop the proxy
- `npm run restart` - Restart the proxy
- `npm run status` - Check if running
- `npm run trust-cert` - Trust SSL certificate (optional)

## 🔧 Usage

The proxy automatically:
- Generates 10-year self-signed certificates
- Starts HTTPS server on port 4000
- Logs all activity to `logs/` folder
- Runs as background process

**Access Points:**
- Main: https://localhost:4000
- Health: https://localhost:4000/health

## 📦 Deployment

The built `dist/suprema-secure-proxy.exe` is standalone - copy and run anywhere on Windows.

---

For detailed setup instructions, see [SIMPLE-SETUP.md](SIMPLE-SETUP.md)
