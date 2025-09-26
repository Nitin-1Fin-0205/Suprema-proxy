// src/app.js
const express = require('express');
const config = require('./config/config');
const Logger = require('./logger/logger');
const BiometricRoutes = require('./routes/biometric.routes');
const corsMiddleware = require('./middleware/cors.middleware');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const logger = new Logger(config.logDir);

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
// Forward all other requests
app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/session-status' || req.path.startsWith('/bio/')) {
        return next();
    }
});
module.exports = { app, logger };
