// src/routes/biometric.routes.js - Biometric API Routes Handler
// Handles all biometric-related API endpoints for the secure proxy

const express = require('express');
const BiometricService = require('../services/biometric.service');

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

        // Fingerprint capture endpoint
        this.router.post('/capture-fingerprint', async (req, res) => {
            const startTime = Date.now();
            try {
                this.setCorsHeaders(req, res);
                this.logger.info('Fingerprint capture request received', {
                    endpoint: '/bio/capture-fingerprint'
                });
                // Call the biometric service to capture fingerprint
                const captureResult = await this.biometricService.captureFingerprint();
                const duration = Date.now() - startTime;
                // Return both file paths and base64 data for flexibility
                return res.status(200).json({
                    success: true,
                    bmpPath: captureResult.bmpPath,
                    tplPath: captureResult.tplPath,
                    bmpBase64: captureResult.bmpBuffer.toString('base64'),
                    tplBase64: captureResult.tplBuffer.toString('base64'),
                    duration,
                    timestamp: new Date().toISOString(),
                    endpoint: '/bio/capture-fingerprint'
                });
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error('Fingerprint capture endpoint error:', {
                    message: error.message,
                    stack: error.stack,
                    duration: duration + 'ms'
                });
                this.setCorsHeaders(req, res);
                return res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: error.message,
                    duration,
                    timestamp: new Date().toISOString(),
                    endpoint: '/bio/capture-fingerprint'
                });
            }
        });

        // Device info endpoint
        this.router.get('/device-info', async (req, res) => {
            try {
                this.setCorsHeaders(req, res);
                const info = await this.biometricService.getDeviceInfo();
                return res.status(200).json({ success: true, info });
            } catch (error) {
                this.logger.error('Device info error:', error.message);
                this.setCorsHeaders(req, res);
                return res.status(500).json({ success: false, error: error.message });
            }
        });

        // List devices endpoint
        this.router.get('/list-devices', async (req, res) => {
            try {
                this.setCorsHeaders(req, res);
                const devices = await this.biometricService.listDevices();
                return res.status(200).json({ success: true, devices });
            } catch (error) {
                this.logger.error('List devices error:', error.message);
                this.setCorsHeaders(req, res);
                return res.status(500).json({ success: false, error: error.message });
            }
        });

        // 1:1 verification endpoint
        this.router.post('/verify', async (req, res) => {
            try {
                this.setCorsHeaders(req, res);
                const { template1, template2 } = req.body;
                if (!template1 || !template2) {
                    return res.status(400).json({ success: false, error: 'Both templates required' });
                }
                const result = await this.biometricService.verifyTemplates(template1, template2);
                return res.status(200).json({ success: true, result });
            } catch (error) {
                this.logger.error('Verification error:', error.message);
                this.setCorsHeaders(req, res);
                return res.status(500).json({ success: false, error: error.message });
            }
        });

        // 1:N identification endpoint
        this.router.post('/identify', async (req, res) => {
            try {
                this.setCorsHeaders(req, res);
                const { probeTemplate, galleryTemplates } = req.body;
                if (!probeTemplate || !galleryTemplates) {
                    return res.status(400).json({ success: false, error: 'probeTemplate and galleryTemplates required' });
                }
                const result = await this.biometricService.identifyTemplate(probeTemplate, galleryTemplates);
                return res.status(200).json({ success: true, result });
            } catch (error) {
                this.logger.error('Identification error:', error.message);
                this.setCorsHeaders(req, res);
                return res.status(500).json({ success: false, error: error.message });
            }
        });

        // Quality endpoint
        this.router.post('/quality', async (req, res) => {
            try {
                this.setCorsHeaders(req, res);
                const { image, template } = req.body;
                if (!image && !template) {
                    return res.status(400).json({ success: false, error: 'image or template required' });
                }
                const result = await this.biometricService.getQuality({ image, template });
                return res.status(200).json({ success: true, result });
            } catch (error) {
                this.logger.error('Quality error:', error.message);
                this.setCorsHeaders(req, res);
                return res.status(500).json({ success: false, error: error.message });
            }
        });

        // Create session endpoint
        this.router.post('/create-session', async (req, res) => {
            try {
                this.setCorsHeaders(req, res);
                const session = await this.biometricService.createSession();
                return res.status(200).json({ success: true, session });
            } catch (error) {
                this.logger.error('Create session error:', error.message);
                this.setCorsHeaders(req, res);
                return res.status(500).json({ success: false, error: error.message });
            }
        });

        // Cleanup session endpoint
        this.router.post('/cleanup-session', async (req, res) => {
            try {
                this.setCorsHeaders(req, res);
                const { sessionId } = req.body;
                if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });
                await this.biometricService.cleanupSession(sessionId);
                return res.status(200).json({ success: true });
            } catch (error) {
                this.logger.error('Cleanup session error:', error.message);
                this.setCorsHeaders(req, res);
                return res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    // Get the configured router
    getRouter() {
        return this.router;
    }

}

module.exports = BiometricRoutes;
