// src/services/forwarder.service.js
const http = require('http');
const https = require('https');
const { URL } = require('url');

class ForwarderService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    async forwardRequest(req, res) {
        try {
            const origin = req.headers.origin;
            const targetUrl = new URL(`${this.config.targetServer}${req.originalUrl}`);
            const isCapture = req.originalUrl.includes('capture');
            const timeout = isCapture ? 60000 : 30000;
            const filteredHeaders = { ...req.headers };
            if (req.query.username) {
                filteredHeaders.cookie = filteredHeaders.cookie
                    ? `${filteredHeaders.cookie}; username=${req.query.username}`
                    : `username=${req.query.username}`;
                this.logger.info(`Session ID forwarded: ${req.query.username.substring(0, 8)}...`);
            }
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
            if (isCapture) {
                const sessionId = req.query.username;
                this.logger.info(`Biometric capture request: ${req.method} ${req.originalUrl} to ${this.config.targetServer} (${timeout}ms timeout)${sessionId ? ` [Session: ${sessionId.substring(0, 8)}...]` : ' [No Session]'}`);
            } else {
                this.logger.info(`Forwarding ${req.method} ${req.originalUrl} to ${this.config.targetServer}`);
            }
            const httpModule = targetUrl.protocol === 'https:' ? https : http;
            const startTime = Date.now();
            const proxyReq = httpModule.request(options, (proxyRes) => {
                if (origin && this.config.allowedOrigins.includes(origin)) {
                    res.setHeader('Access-Control-Allow-Origin', origin);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                }
                Object.keys(proxyRes.headers).forEach(header => {
                    const lowerHeader = header.toLowerCase();
                    if (!lowerHeader.includes('access-control') &&
                        !lowerHeader.includes('connection') &&
                        !lowerHeader.includes('transfer-encoding')) {
                        res.setHeader(header, proxyRes.headers[header]);
                    }
                });
                if (proxyRes.headers['set-cookie']) {
                    res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
                }
                res.status(proxyRes.statusCode);
                proxyRes.pipe(res);
                const duration = Date.now() - startTime;
                this.logger.info(`Response ${proxyRes.statusCode} for ${req.method} ${req.originalUrl} (${duration}ms)`);
            });
            proxyReq.on('error', (error) => {
                this.logger.error('Forward Error:', {
                    message: error.message,
                    code: error.code,
                    url: req.originalUrl,
                    target: this.config.targetServer,
                    targetUrl: targetUrl.href
                });
                const origin = req.headers.origin;
                if (origin && this.config.allowedOrigins.includes(origin)) {
                    res.setHeader('Access-Control-Allow-Origin', origin);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                }
                if (error.message.includes('session') || error.message.includes('unauthorized')) {
                    res.status(401).json({
                        error: 'Session Error',
                        message: 'Invalid or expired biometric session',
                        target: this.config.targetServer,
                        suggestion: 'Please create a new session and try again'
                    });
                    return;
                }
                if (error.code === 'ECONNREFUSED') {
                    res.status(503).json({
                        error: 'Service Unavailable',
                        message: 'Target server is not running',
                        target: this.config.targetServer,
                        suggestion: 'Please start the biometric service on ' + this.config.targetServer
                    });
                } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                    res.status(504).json({
                        error: 'Gateway Timeout',
                        message: isCapture ? 'Biometric capture operation timed out' : 'Request timed out',
                        target: this.config.targetServer,
                        timeout: timeout,
                        suggestion: isCapture ? 'Biometric capture may take longer than expected. Please try again.' : 'Please try again.'
                    });
                } else {
                    res.status(502).json({
                        error: 'Proxy Error',
                        message: error.message,
                        target: this.config.targetServer,
                        details: error.message
                    });
                }
            });
            proxyReq.on('timeout', () => {
                proxyReq.destroy();
                this.logger.error('Request timeout:', {
                    url: req.originalUrl,
                    timeout: timeout,
                    isCapture: isCapture
                });
                const origin = req.headers.origin;
                if (origin && this.config.allowedOrigins.includes(origin)) {
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
            if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
                req.pipe(proxyReq);
            } else {
                proxyReq.end();
            }
        } catch (error) {
            this.logger.error('Forward Error:', {
                message: error.message,
                stack: error.stack,
                url: req.originalUrl
            });
            const origin = req.headers.origin;
            if (origin && this.config.allowedOrigins.includes(origin)) {
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
}

module.exports = ForwarderService;
