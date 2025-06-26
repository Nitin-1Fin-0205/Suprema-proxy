// biometric.routes.js - Biometric API Routes Handler
// Handles all biometric-related API endpoints for the secure proxy

const express = require('express');
const BiometricService = require('./biometric.service');

class BiometricRoutes {
    constructor(logger, config) {
        this.logger = logger;
        this.config = config;
        this.biometricService = new BiometricService(logger);
        this.router = express.Router();
        this.setupRoutes();
    }

    // Setup CORS headers for biometric routes
    setCorsHeaders(req, res) {
        const origin = req.headers.origin;
        if (origin && this.config.allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    // Setup all biometric routes
    setupRoutes() {
        // OPTIONS handler for CORS preflight
        this.router.options('*', (req, res) => {
            this.setCorsHeaders(req, res);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID');
            res.status(200).end();
        });

        // Fingerprint identification endpoint
        this.router.post('/identify-fingerprint', async (req, res) => {
            const startTime = Date.now();

            try {
                this.setCorsHeaders(req, res);

                // Validate request body
                const { liveTemplate } = req.body;

                if (!liveTemplate) {
                    this.logger.warn('Fingerprint identification attempted without live template');
                    return res.status(400).json({
                        success: false,
                        error: 'Missing Template',
                        message: 'Live fingerprint template is required',
                        suggestion: 'Please provide liveTemplate in the request body'
                    });
                }

                this.logger.info('Fingerprint identification request received', {
                    templateSize: liveTemplate.length,
                    endpoint: '/bio/identify-fingerprint'
                });

                // Process fingerprint identification
                this.logger.info('Calling biometric service for identification...');
                const identificationResult = await this.biometricService.identifyFingerprint(liveTemplate);

                this.logger.info('Biometric service result:', {
                    hasStatusCode: !!identificationResult.status_code,
                    hasSuccess: !!identificationResult.success,
                    resultKeys: Object.keys(identificationResult)
                });

                const duration = Date.now() - startTime;

                // Return result based on service response format
                if (identificationResult.status_code) {
                    // Service returned with status_code format
                    const responseStatus = identificationResult.status_code === 200 ? 200 :
                        identificationResult.status_code === 404 ? 404 : 500;

                    return res.status(responseStatus).json({
                        ...identificationResult,
                        duration: duration,
                        timestamp: new Date().toISOString(),
                        endpoint: '/bio/identify-fingerprint'
                    });
                } else {
                    const response = {
                        ...identificationResult,
                        duration: duration,
                        timestamp: new Date().toISOString(),
                        endpoint: '/bio/identify-fingerprint'
                    };

                    if (identificationResult.success) {
                        return res.status(200).json(response);
                    } else {
                        return res.status(500).json(response);
                    }
                }
            } catch (error) {
                const duration = Date.now() - startTime;

                this.logger.error('Fingerprint identification endpoint error:', {
                    message: error.message,
                    stack: error.stack,
                    duration: duration + 'ms'
                });

                this.setCorsHeaders(req, res); res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message,
                    duration: duration,
                    timestamp: new Date().toISOString(),
                    endpoint: '/bio/identify-fingerprint'
                });
            }
        });

    }

    // Get the configured router
    getRouter() {
        return this.router;
    }

}

module.exports = BiometricRoutes;
