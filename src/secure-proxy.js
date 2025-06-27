// secure-proxy.js - Automated Secure HTTPS Proxy with Certificate Trust

const fs = require('fs');
const https = require('https');
const http = require('http');
const express = require('express');
const { URL } = require('url');
const path = require('path');
const { execSync } = require('child_process');

// Import BiometricRoutes
const BiometricRoutes = require('./biometric.routes.js');

const app = express();
const PORT = 4000;

// Configuration
const CONFIG = {
  allowedOrigins: [
    'http://localhost:5173',
    'https://localhost:5173',
    'https://newuat.eos.onefin.app',
    'https://uat.lms.onefin.app',
    'http://localhost:3000',
    'http://localhost:8080',
  ],
  targetServer: process.env.TARGET_SERVER || 'http://127.0.0.1:8084',
  port: process.env.PORT || PORT,
  isDevelopment: process.env.NODE_ENV !== 'production'
};

// Logging System
class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Could not create logs directory:', error.message);
      this.logDir = null;
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      pid: process.pid
    };

    // Console output
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');

    // File logging
    if (this.logDir) {
      try {
        const logFile = path.join(this.logDir, `secure-proxy-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
      } catch (error) {
        console.warn('Could not write to log file:', error.message);
      }
    }
  }

  info(message, data) { this.log('info', message, data); }
  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
}

const logger = new Logger();

// Enhanced auto-trust certificate function with better user guidance
function autoTrustCertificate() {
  const certPath = path.join(process.cwd(), 'certs', 'localhost.crt');

  if (!fs.existsSync(certPath)) {
    logger.warn('Certificate file not found, cannot auto-trust');
    return false;
  }

  try {
    logger.info('Attempting to auto-trust SSL certificate...');

    // Method 1: Try certlm.exe (preferred for system-wide trust)
    try {
      execSync(`certlm.exe -add -c "${certPath}" -s -r localMachine root`, {
        stdio: 'ignore',
        timeout: 10000
      });
      logger.info('✅ Certificate automatically trusted system-wide - browser warnings eliminated');
      return true;
    } catch (certlmError) {
      logger.warn('certlm.exe failed, trying PowerShell method...');
    }

    // Method 2: Try PowerShell Import-Certificate (fallback)
    try {
      const powershellCmd = `Import-Certificate -FilePath "${certPath}" -CertStoreLocation Cert:\\LocalMachine\\Root`;
      execSync(`powershell -Command "${powershellCmd}"`, {
        stdio: 'ignore',
        timeout: 10000
      });
      logger.info('✅ Certificate automatically trusted via PowerShell - browser warnings eliminated');
      return true;
    } catch (powershellError) {
      logger.warn('PowerShell import failed');
    }

    // If both methods fail, provide guidance
    logger.warn('❌ Could not auto-trust certificate (requires admin privileges)');
    logger.info('');
    logger.info('🔧 MANUAL TRUST INSTRUCTIONS:');
    logger.info('1. Run as Administrator and restart the service, OR');
    logger.info('2. Double-click: certs/localhost.crt');
    logger.info('3. Click "Install Certificate"');
    logger.info('4. Select "Local Machine" → "Place certificates in: Trusted Root"');
    logger.info('5. Restart browser');
    logger.info('');
    logger.info('📋 Or use: npm run trust-cert (as Administrator)');
    logger.info('');

    return false;

  } catch (error) {
    logger.warn('Certificate trust process failed:', error.message);
    logger.info('Users can manually trust the certificate or accept browser warnings');
    return false;
  }
}

// Certificate validation - use pre-generated certificates
function ensureCertificatesExist() {
  const certDir = path.join(process.cwd(), 'certs');
  const keyPath = path.join(certDir, 'localhost.key');
  const certPath = path.join(certDir, 'localhost.crt');

  // Check if certificates exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    logger.info('SSL certificates found - using pre-generated certificates');

    // Validate certificate expiry
    try {
      const certContent = fs.readFileSync(certPath, 'utf8');
      const cert = certContent.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
      if (cert) {
        logger.info('Certificate validated successfully');
      }
    } catch (error) {
      logger.warn('Certificate validation warning:', error.message);
    }

    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  }

  // Certificates missing - provide clear instructions
  logger.error('SSL certificates not found!');
  logger.error('Required files missing:');
  logger.error(`  - ${keyPath}`);
  logger.error(`  - ${certPath}`);
  logger.error('');
  logger.error('SOLUTION: Copy your pre-generated certificates to the certs/ directory');
  logger.error('The same certificates should be deployed to all client machines for consistency');
  logger.error('');
  logger.error('To generate certificates once (for development):');
  logger.error('  npm run generate-certs');
  logger.error('');
  logger.error('Then copy the generated certs/ directory to all deployment packages');

  process.exit(1);
}

// Body parsing middleware for JSON requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize biometric routes
const biometricRoutes = new BiometricRoutes(logger, CONFIG);
app.use('/bio', biometricRoutes.getRouter());

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CONFIG.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const origin = req.headers.origin;
  if (origin && CONFIG.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'Suprema Secure Proxy',
    version: '1.0.0'
  });
});

// Session status endpoint
app.get('/session-status', (req, res) => {
  const origin = req.headers.origin;
  if (origin && CONFIG.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  const hasSession = !!(req.query.username || req.headers.cookie?.includes('username='));
  const sessionId = req.query.username || req.headers.cookie?.match(/username=([^;]+)/)?.[1];

  res.json({
    status: 'ok',
    hasSession: hasSession,
    sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : null,
    timestamp: new Date().toISOString(),
    server: 'Suprema Secure Proxy'
  });
});

// Session validation middleware for biometric operations
app.use('/api', (req, res, next) => {
  // Check for session ID in biometric operations
  const isBiometricOperation = req.originalUrl.includes('capture') ||
    req.originalUrl.includes('deviceInfo') ||
    req.originalUrl.includes('initialize');

  if (isBiometricOperation && !req.query.username && !req.headers.cookie?.includes('username=')) {
    logger.warn(`Biometric operation without session: ${req.method} ${req.originalUrl}`);

    const origin = req.headers.origin;
    if (origin && CONFIG.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    return res.status(400).json({
      error: 'Session Required',
      message: 'Biometric operations require a valid session ID',
      suggestion: 'Please create a session first using /api/createSessionID'
    });
  }

  next();
});

// Custom request forwarder using native Node.js HTTP with extended timeout for biometric operations
async function forwardRequest(req, res) {
  try {
    const origin = req.headers.origin;
    const targetUrl = new URL(`${CONFIG.targetServer}${req.originalUrl}`);

    // Extended timeout for biometric capture operations
    const isCapture = req.originalUrl.includes('capture');
    const timeout = isCapture ? 60000 : 30000; // 60s for capture, 30s for others

    // Prepare request options
    const filteredHeaders = { ...req.headers };

    // Handle session ID from URL parameter and convert to cookie format
    if (req.query.username) {
      filteredHeaders.cookie = filteredHeaders.cookie
        ? `${filteredHeaders.cookie}; username=${req.query.username}`
        : `username=${req.query.username}`;

      logger.info(`Session ID forwarded: ${req.query.username.substring(0, 8)}...`);
    }

    // Remove problematic headers that shouldn't be forwarded
    delete filteredHeaders['host'];
    delete filteredHeaders['origin'];
    delete filteredHeaders['referer'];
    delete filteredHeaders['sec-ch-ua'];
    delete filteredHeaders['sec-ch-ua-mobile'];
    delete filteredHeaders['sec-ch-ua-platform'];
    delete filteredHeaders['sec-fetch-dest'];
    delete filteredHeaders['sec-fetch-mode'];
    delete filteredHeaders['sec-fetch-site'];
    delete filteredHeaders['sec-fetch-storage-access'];

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...filteredHeaders,
        host: targetUrl.host,
        'user-agent': 'Suprema-Proxy/1.0'
      },
      timeout: timeout,
    };

    // Enhanced logging with session info
    if (isCapture) {
      const sessionId = req.query.username;
      logger.info(`Biometric capture request: ${req.method} ${req.originalUrl} to ${CONFIG.targetServer} (${timeout}ms timeout)${sessionId ? ` [Session: ${sessionId.substring(0, 8)}...]` : ' [No Session]'}`);
    } else {
      logger.info(`Forwarding ${req.method} ${req.originalUrl} to ${CONFIG.targetServer}`);
    }

    console.log(`[DEBUG] Target URL: ${targetUrl.href}`);
    console.log(`[DEBUG] Request path: ${options.path}`);
    if (req.query.username) {
      console.log(`[DEBUG] Session ID parameter: ${req.query.username.substring(0, 8)}...`);
    }
    console.log(`[DEBUG] Headers:`, Object.keys(options.headers));

    // Choose HTTP or HTTPS
    const httpModule = targetUrl.protocol === 'https:' ? https : http;

    const startTime = Date.now();
    const proxyReq = httpModule.request(options, (proxyRes) => {
      // Set CORS headers for allowed origins
      if (origin && CONFIG.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }

      // Copy relevant headers from target server (excluding CORS headers)
      Object.keys(proxyRes.headers).forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (!lowerHeader.includes('access-control') &&
          !lowerHeader.includes('connection') &&
          !lowerHeader.includes('transfer-encoding')) {
          res.setHeader(header, proxyRes.headers[header]);
        }
      });

      // Forward cookies from target server to client
      if (proxyRes.headers['set-cookie']) {
        res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
      }

      // Set status code and pipe response
      res.status(proxyRes.statusCode);
      proxyRes.pipe(res);

      const duration = Date.now() - startTime;
      logger.info(`Response ${proxyRes.statusCode} for ${req.method} ${req.originalUrl} (${duration}ms)`);
    });

    // Handle request errors
    proxyReq.on('error', (error) => {
      console.log(`[DEBUG] Proxy request error:`, error);
      logger.error('Forward Error:', {
        message: error.message,
        code: error.code,
        url: req.originalUrl,
        target: CONFIG.targetServer,
        targetUrl: targetUrl.href
      });

      const origin = req.headers.origin;
      if (origin && CONFIG.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // Add session-specific error handling
      if (error.message.includes('session') || error.message.includes('unauthorized')) {
        res.status(401).json({
          error: 'Session Error',
          message: 'Invalid or expired biometric session',
          target: CONFIG.targetServer,
          suggestion: 'Please create a new session and try again'
        });
        return;
      }

      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'Target server is not running',
          target: CONFIG.targetServer,
          suggestion: 'Please start the biometric service on ' + CONFIG.targetServer
        });
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: isCapture ? 'Biometric capture operation timed out' : 'Request timed out',
          target: CONFIG.targetServer,
          timeout: timeout,
          suggestion: isCapture ? 'Biometric capture may take longer than expected. Please try again.' : 'Please try again.'
        });
      } else {
        res.status(502).json({
          error: 'Proxy Error',
          message: error.message,
          target: CONFIG.targetServer,
          details: error.message
        });
      }
    });

    // Handle timeout
    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      logger.error('Request timeout:', {
        url: req.originalUrl,
        timeout: timeout,
        isCapture: isCapture
      });

      const origin = req.headers.origin;
      if (origin && CONFIG.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      res.status(504).json({
        error: 'Timeout Error',
        message: isCapture ? 'Biometric capture operation timed out' : 'Request timed out',
        timeout: timeout,
        timestamp: new Date().toISOString(),
        suggestion: isCapture ? 'Biometric capture may take longer than expected. Please try again.' : 'Please try again.'
      });
    });

    // Forward request body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }

  } catch (error) {
    logger.error('Forward Error:', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl
    });

    const origin = req.headers.origin;
    if (origin && CONFIG.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.status(500).json({
      error: 'Proxy Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Handle all routes except proxy-specific endpoints by forwarding to target server
app.use((req, res, next) => {
  // Skip proxy-specific endpoints that are handled locally
  if (req.path === '/health' ||
    req.path === '/session-status' ||
    req.path.startsWith('/bio/')) {
    return next();
  }
  forwardRequest(req, res);
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Windows Service signal handling
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  gracefulShutdown();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  gracefulShutdown();
});

// Windows specific signals for service control
process.on('SIGHUP', () => {
  logger.info('SIGHUP received, reloading configuration');
});

// Handle uncaught exceptions to prevent service crashes
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Unhandled Rejection:', reason);
});

let server = null;

function gracefulShutdown() {
  logger.info('Initiating graceful shutdown...');
  if (server) {
    server.close((err) => {
      if (err) {
        logger.error('Error during server shutdown:', err);
      } else {
        logger.info('HTTPS server closed successfully');
      }
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Main startup
function startSecureProxy() {
  logger.info('Starting Suprema Secure HTTPS Proxy...');

  // Ensure certificates exist
  const httpsOptions = ensureCertificatesExist();

  // Attempt to auto-trust certificate
  autoTrustCertificate();

  // Create HTTPS server
  server = https.createServer(httpsOptions, app);

  server.listen(CONFIG.port, () => {
    logger.info('Suprema Secure HTTPS Proxy started', {
      port: CONFIG.port,
      targetServer: CONFIG.targetServer,
      allowedOrigins: CONFIG.allowedOrigins,
      sslCert: 'Self-signed (10-year validity)',
      environment: CONFIG.isDevelopment ? 'development' : 'production'
    });

    console.log('========================================');
    console.log('  SUPREMA SECURE HTTPS PROXY STARTED  ');
    console.log('========================================');
    console.log(`  HTTPS URL: https://localhost:${CONFIG.port}`);
    console.log(`  Alternative: https://127.0.0.1:${CONFIG.port}`);
    console.log(`  Target: ${CONFIG.targetServer}`);
    console.log(`  Health: https://localhost:${CONFIG.port}/health`);
    console.log(`  Session Status: https://localhost:${CONFIG.port}/session-status`);
    console.log(`  Biometric ID: https://localhost:${CONFIG.port}/api/identify-fingerprint`);
    console.log('  Certificate: 10-year self-signed');
    console.log('========================================');

    // Signal successful startup for Windows Service
    if (process.platform === 'win32') {
      // Send ready signal to Windows SCM
      process.send && process.send('ready');
    }
  });

  server.on('error', (error) => {
    logger.error('HTTPS Server Error:', error.message);
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${CONFIG.port} is already in use`);
      process.exit(1);
    } else {
      logger.error('Failed to start HTTPS server');
      process.exit(1);
    }
  });
}

// Start the proxy
startSecureProxy();