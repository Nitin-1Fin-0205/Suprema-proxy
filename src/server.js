// src/server.js
const https = require('https');
const { app, logger } = require('./app');
const config = require('./config/config');
const { ensureCertificatesExist, autoTrustCertificate } = require('./utils/certificates');

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
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
}

function startSecureProxy() {
    logger.info('Starting Suprema Secure HTTPS Proxy...');
    const httpsOptions = ensureCertificatesExist(config.certDir, logger);
    autoTrustCertificate(config.certDir, logger);
    server = https.createServer(httpsOptions, app);
    server.listen(config.port, () => {
        logger.info('Suprema Secure HTTPS Proxy started', {
            port: config.port,
            targetServer: config.targetServer,
            allowedOrigins: config.allowedOrigins,
            sslCert: 'Self-signed (10-year validity)',
            environment: config.isDevelopment ? 'development' : 'production'
        });
        console.log('========================================');
        console.log('  SUPREMA SECURE HTTPS PROXY STARTED  ');
        console.log('========================================');
        console.log(`  HTTPS URL: https://localhost:${config.port}`);
        console.log(`  Alternative: https://127.0.0.1:${config.port}`);
        console.log(`  Target: ${config.targetServer}`);
        console.log(`  Health: https://localhost:${config.port}/health`);
        console.log(`  Session Status: https://localhost:${config.port}/session-status`);
        console.log(`  Biometric ID: https://localhost:${config.port}/api/identify-fingerprint`);
        console.log('  Certificate: 10-year self-signed');
        console.log('========================================');
        if (process.platform === 'win32') {
            process.send && process.send('ready');
        }
    });
    server.on('error', (error) => {
        logger.error('HTTPS Server Error:', error.message);
        if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${config.port} is already in use`);
            process.exit(1);
        } else {
            logger.error('Failed to start HTTPS server');
            process.exit(1);
        }
    });
}

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    gracefulShutdown();
});
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    gracefulShutdown();
});
process.on('SIGHUP', () => {
    logger.info('SIGHUP received, reloading configuration');
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    console.error('Uncaught Exception:', error);
    gracefulShutdown();
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('Unhandled Rejection:', reason);
});

startSecureProxy();
