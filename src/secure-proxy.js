// secure-proxy.js - Automated Secure HTTPS Proxy with Certificate Trust

const fs = require('fs');
const https = require('https');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const { execSync } = require('child_process');

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
  targetServer: process.env.TARGET_SERVER || 'http://localhost:8084',
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

// Auto-trust certificate function
function autoTrustCertificate() {
  const certPath = path.join(process.cwd(), 'certs', 'localhost.crt');

  if (!fs.existsSync(certPath)) {
    logger.warn('Certificate file not found, cannot auto-trust');
    return false;
  }

  try {
    logger.info('Attempting to auto-trust SSL certificate...');

    // Use certlm.exe to add certificate to trusted root store
    execSync(`certlm.exe -add -c "${certPath}" -s -r localMachine root`, {
      stdio: 'ignore',
      timeout: 10000
    });

    logger.info('Certificate automatically trusted - browser warnings eliminated');
    return true;
  } catch (error) {
    logger.warn('Could not auto-trust certificate (requires admin privileges):', error.message);
    logger.info('Users can manually trust or accept browser warnings');
    return false;
  }
}

// Certificate generation/validation
function ensureCertificatesExist() {
  const certDir = path.join(process.cwd(), 'certs');
  const keyPath = path.join(certDir, 'localhost.key');
  const certPath = path.join(certDir, 'localhost.crt');

  // Check if certificates exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    logger.info('SSL certificates found');
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  }

  logger.info('SSL certificates not found, generating new ones...');

  // Create certs directory
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  try {
    // Try using OpenSSL
    logger.info('Generating SSL certificates with 10-year validity...');

    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'ignore' });
    execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 3650 -subj "/C=US/ST=CA/L=San Francisco/O=Suprema Proxy/OU=Biometric/CN=localhost"`, { stdio: 'ignore' });

    logger.info('SSL certificates generated successfully (10-year validity)');

    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };

  } catch (error) {
    logger.error('Failed to generate certificates with OpenSSL:', error.message);
    logger.error('Please install OpenSSL or run npm run generate-certs manually');
    process.exit(1);
  }
}

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

// Proxy middleware
app.use('/api', createProxyMiddleware({
  target: CONFIG.targetServer,
  changeOrigin: true,
  secure: false,
  onProxyReq: (proxyReq, req) => {
    if (req.headers.cookie) {
      proxyReq.setHeader('cookie', req.headers.cookie);
    }
    logger.info(`Proxying ${req.method} ${req.originalUrl} to ${CONFIG.targetServer}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.info(`Response ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`);
  },
  onError: (err, req, res) => {
    logger.error('Proxy error:', err.message);
    res.status(502).json({
      error: 'Proxy Error',
      message: 'Cannot connect to target server',
      target: CONFIG.targetServer
    });
  }
}));

// Catch-all proxy for non-API routes
app.use('*', createProxyMiddleware({
  target: CONFIG.targetServer,
  changeOrigin: true,
  secure: false,
  onProxyReq: (proxyReq, req) => {
    if (req.headers.cookie) {
      proxyReq.setHeader('cookie', req.headers.cookie);
    }
  }
}));

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

  server.listen(CONFIG.port, '127.0.0.1', () => {
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
    console.log(`  HTTPS URL: https://127.0.0.1:${CONFIG.port}`);
    console.log(`  Target: ${CONFIG.targetServer}`);
    console.log(`  Health: https://127.0.0.1:${CONFIG.port}/health`);
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