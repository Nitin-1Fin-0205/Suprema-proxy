// proxy.js - Production Ready Biometric Proxy Server

process.noDeprecation = true;

const express = require('express');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');

const app = express();

// ✅ Production Configuration
const CONFIG = {
  allowedOrigins: [
    'http://localhost:5173',
    'https://newuat.eos.onefin.app',
    'https://uat.lms.onefin.app',
    'http://localhost:3000', // Common dev port
    'http://localhost:8080', // Common dev port
  ],
  targetServer: process.env.TARGET_SERVER || 'http://localhost:8084',
  port: process.env.PORT || 4000,
  logLevel: process.env.LOG_LEVEL || 'info',
  isDevelopment: process.env.NODE_ENV !== 'production'
};

// ✅ Logging System
class Logger {
  constructor() {
    // Use a writable directory outside the executable
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      // If we can't create logs directory, just log to console
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
    if (CONFIG.isDevelopment || level === 'error') {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
    }

    // File logging (only if logDir is available)
    if (this.logDir) {
      try {
        const logFile = path.join(this.logDir, `proxy-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
      } catch (error) {
        // Silently fail file logging if there are issues
        console.warn('Could not write to log file:', error.message);
      }
    }
  }

  info(message, data) { this.log('info', message, data); }
  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
}

const logger = new Logger();

// ✅ Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORS middleware for all requests
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (origin && CONFIG.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    return res.sendStatus(200);
  }

  next();
});

// ✅ Custom request forwarder using native Node.js HTTP
async function forwardRequest(req, res) {
  try {
    const origin = req.headers.origin;
    const targetUrl = new URL(`${CONFIG.targetServer}${req.originalUrl}`);

    // Prepare request options
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
      timeout: 30000,
    };

    logger.info(`Forwarding ${req.method} ${req.originalUrl}`, { origin, target: targetUrl.href });

    // Choose HTTP or HTTPS
    const httpModule = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = httpModule.request(options, (proxyRes) => {
      // Set CORS headers only for allowed origins
      if (origin && CONFIG.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        logger.info('Added CORS headers for allowed origin', { origin });
      } else {
        logger.warn('Origin not allowed or missing', { origin });
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
        logger.info('Forwarding cookies from target server');
      }

      // Set status code and pipe response
      res.status(proxyRes.statusCode);
      proxyRes.pipe(res);

      logger.info('Response sent successfully', { status: proxyRes.statusCode });
    });

    // Handle request errors
    proxyReq.on('error', (error) => {
      logger.error('Forward Error', { message: error.message, stack: error.stack });

      const origin = req.headers.origin;
      if (origin && CONFIG.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      if (error.code === 'ECONNREFUSED') {
        res.status(502).json({
          error: 'Connection Error',
          message: 'Cannot connect to target server',
          target: CONFIG.targetServer,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: 'Proxy Error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle timeout
    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({
        error: 'Timeout Error',
        message: 'Request to target server timed out',
        timestamp: new Date().toISOString()
      });
    });

    // Forward request body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }

  } catch (error) {
    logger.error('Forward Error', { message: error.message, stack: error.stack });

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

// ✅ Optional: Health check
app.get('/health', (req, res) => {
  const origin = req.headers.origin;
  if (origin && CONFIG.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ✅ Handle all other routes by forwarding to target server
app.all('*', forwardRequest);

// ✅ Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// ✅ Start server
const PORT = CONFIG.port;
const server = app.listen(PORT, () => {
  logger.info(`Suprema Biometric Proxy Server started`, {
    port: PORT,
    targetServer: CONFIG.targetServer,
    allowedOrigins: CONFIG.allowedOrigins,
    environment: CONFIG.isDevelopment ? 'development' : 'production'
  });
  console.log(`✅ Proxy server running at http://localhost:${PORT}`);
});

// ✅ Handle server errors
server.on('error', (error) => {
  logger.error('Server Error', { error: error.message, code: error.code });
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
});
