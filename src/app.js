// src/app.js
const express = require('express');
const config = require('./config/config');
const Logger = require('./logger/logger');
const BiometricRoutes = require('./routes/biometric.routes');
const corsMiddleware = require('./middleware/cors.middleware');
const sessionMiddleware = require('./middleware/session.middleware');
const ForwarderService = require('./services/forwarder.service');

const app = express();
const logger = new Logger(config.logDir);
const forwarder = new ForwarderService(config, logger);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/bio', new BiometricRoutes(logger, config).getRouter());
app.use(corsMiddleware(config.allowedOrigins));
app.get('/health', (req, res) => {
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.includes(origin)) {
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
app.get('/session-status', (req, res) => {
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.includes(origin)) {
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
app.use('/api', sessionMiddleware(logger, config.allowedOrigins));
// Forward all other requests
app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/session-status' || req.path.startsWith('/bio/')) {
        return next();
    }
    forwarder.forwardRequest(req, res);
});
module.exports = { app, logger };
