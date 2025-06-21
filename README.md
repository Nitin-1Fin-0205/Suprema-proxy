# Suprema Biometric Proxy Server

A production-ready proxy server for Suprema biometric devices with auto-start capabilities and comprehensive logging.

## Features

- 🔄 **Request Forwarding**: Forwards all requests to the biometric agent
- 🔒 **CORS Security**: Configurable allowed origins  
- 🍪 **Session Management**: Full cookie forwarding support
- 📝 **Production Logging**: File-based logging with rotation
- 🚀 **Auto-Start**: Multiple installation methods for reliability
- 🛡️ **Error Handling**: Graceful error handling and recovery
- 📊 **Health Monitoring**: Built-in health check endpoint

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd suprema-proxy
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Run the proxy server:**
   ```
   npm start
   ```

   The server will start and listen on `http://localhost:3001/agent`.

## Building the Executable

To create a standalone executable for the proxy server, you can use `pkg`. Follow these steps:

1. **Install pkg globally:**
   ```
   npm install -g pkg
   ```

2. **Build the executable:**
   ```
   pkg . --targets node18-win-x64 --output suprema-proxy.exe
   ```

   This will generate `suprema-proxy.exe`, which includes Node.js and all required dependencies. It can run on any 64-bit Windows machine without needing Node.js installed.

## Quick Start

### Development
```bash
npm install
npm start
```

### Production Deployment

1. **Build the executable:**
```bash
npm run build-win
```

2. **Install with auto-start (recommended):**
```bash
# Run PowerShell as Administrator
npm run install-all
```

This will install the proxy using all available methods for maximum reliability.

## Installation Methods

### Method 1: Windows Service (Recommended)
```bash
npm run install-service
```
- Runs as a system service
- Automatic restart on failure
- Starts before user login
- Best for production servers

### Method 2: Startup Registry
```bash
npm run install-startup
```
- Starts when Windows boots
- Runs in user context
- Simple and reliable

### Method 3: Scheduled Task
```bash
npm run install-task
```
- Task Scheduler based
- Auto-restart capabilities
- Most flexible timing options

### Method 4: All Methods (Maximum Reliability)
```bash
npm run install-all
```
- Installs using all three methods
- Ensures the service starts "at any cost"
- Recommended for critical deployments

## Configuration

The proxy can be configured via environment variables:

```bash
# Target server (biometric agent)
TARGET_SERVER=http://localhost:8084

# Proxy port
PORT=4000

# Allowed origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.com

# Environment
NODE_ENV=production

# Log level
LOG_LEVEL=info
```

## Auto-Start Concept Explained

### The Challenge
We need the proxy to start automatically and stay running regardless of:
- System reboots
- Application crashes  
- User logoffs
- Power failures
- System updates

### Our Solution: Triple Redundancy

We implement **three independent auto-start mechanisms**:

#### 1. Windows Service
- **Purpose**: System-level service that starts before user login
- **Benefits**: 
  - Runs as SYSTEM account
  - Automatic failure recovery
  - Starts on boot regardless of user login
  - Managed by Windows Service Manager
- **Reliability**: Highest - part of Windows core functionality

#### 2. Registry Startup Entry
- **Purpose**: Backup method using Windows startup registry
- **Benefits**:
  - Simple and lightweight
  - Works if service mechanism fails
  - User-independent startup
- **Reliability**: High - standard Windows feature

#### 3. Scheduled Task
- **Purpose**: Task Scheduler based with aggressive restart policy
- **Benefits**:
  - Runs with highest privileges
  - Configurable restart intervals (every minute if failed)
  - Multiple trigger conditions
  - Independent of other methods
- **Reliability**: Very High - enterprise-grade scheduling

### Why This Works "At Any Cost"

1. **Independence**: Each method operates independently
2. **Redundancy**: If one fails, others continue working
3. **Recovery**: Multiple restart mechanisms ensure recovery from crashes
4. **Monitoring**: Each method monitors and restarts the application
5. **Persistence**: Registry and scheduled tasks survive system changes

### Monitoring and Logs

- **Application Logs**: `logs/proxy-YYYY-MM-DD.log`
- **Windows Event Logs**: Check Windows Event Viewer for service events
- **Health Check**: `GET http://localhost:4000/health`

## Management Commands

### Service Management
```powershell
# Check status
Get-Service -Name "SupremaProxy"

# Start/Stop
Start-Service -Name "SupremaProxy"
Stop-Service -Name "SupremaProxy"

# Remove
sc.exe delete "SupremaProxy"
```

### Task Management  
```powershell
# Check status
Get-ScheduledTask -TaskName "SupremaProxyService"

# Start/Stop
Start-ScheduledTask -TaskName "SupremaProxyService"
Stop-ScheduledTask -TaskName "SupremaProxyService"

# Remove
Unregister-ScheduledTask -TaskName "SupremaProxyService"
```

### Registry Management
```powershell
# Check entry
Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "SupremaProxy"

# Remove
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "SupremaProxy"
```

## API Endpoints

- **Health Check**: `GET /health` - Returns server status
- **All Other Routes**: Forwarded to the biometric agent at `localhost:8084`

## Security

- CORS protection with configurable allowed origins
- No wildcard CORS headers in production
- Request/response logging for audit trails
- Secure cookie forwarding

## Troubleshooting

### Common Issues

1. **Port 4000 already in use**
   - Change PORT environment variable
   - Or stop conflicting application

2. **Cannot connect to biometric agent**
   - Verify agent is running on port 8084
   - Check TARGET_SERVER configuration

3. **Service won't start**
   - Check Windows Event Logs
   - Verify executable permissions
   - Run as Administrator

4. **CORS errors**
   - Add your frontend domain to allowedOrigins
   - Check browser developer console

### Log Locations

- Application logs: `{project-root}/logs/`
- Windows Service logs: Windows Event Viewer → Windows Logs → System
- Scheduled Task logs: Task Scheduler → Task Scheduler Library

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build-win

# Clean build artifacts
npm run clean
````