// src/services/biometric.service.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync, execFile } = require('child_process');
const BiometricEncryptionHelper = require('../utils/encryption.helper');
const LocalBiometricDB = require('../database/local-biometric.db');
const SecureBiometricEncryption = require('../utils/secure-encryption.helper');

class BiometricService {
    constructor(logger, config) {
        this.apiURL = 'https://support-backend.onefin.app';
        this.logger = logger;
        this.tempDir = path.join(process.cwd(), 'temp_templates');

        console.log('API URL set to:', this.apiURL);

        // Initialize secure encryption helper
        try {
            this.secureEncryption = new SecureBiometricEncryption(logger);
            this.logger.info('Secure biometric encryption helper initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize secure encryption:', error.message);
            throw error;
        }

        // Initialize legacy encryption helper (backward compatibility)
        try {
            this.encryptionHelper = new BiometricEncryptionHelper();
            this.logger.info('Legacy biometric encryption helper initialized successfully');
        } catch (error) {
            this.logger.warn('Legacy biometric encryption helper not available:', error.message);
            this.encryptionHelper = null;
        }

        // Initialize local database
        try {
            const dbPath = path.join(process.cwd(), 'data', 'biometric.db');
            const dbKey = this.secureEncryption.generateDBKey();
            this.localDB = new LocalBiometricDB(dbPath, dbKey, logger);
            this.logger.info('Local biometric database initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize local database:', error.message);
            throw error;
        }

        // Validate encryption setup
        if (!this.secureEncryption.validateEncryption()) {
            throw new Error('Encryption validation failed - system not secure');
        }
    }

    // Call external API with match result
    async getCustomerLockerAccess(customerId, authToken) {
        try {
            const apiEndpoint = `${this.apiURL}/biometrics/get-matched-customer-locker?customerId=${customerId}`;

            this.logger.info('Calling external API for locker access:', apiEndpoint);
            const response = await fetch(apiEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Suprema-Proxy-BiometricService/1.0',
                    'Authorization': authToken ? authToken : ''
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch locker data: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.logger.info('External API response:', response.status, data);
            return data;

        } catch (error) {
            this.logger.error('Failed to call external API:', error.message);
            throw error;
        }
    }

    // Store customer template locally with encryption
    storeCustomerTemplate(customerId, templateData, fingerPosition, qualityScore = 0) {
        try {
            this.logger.info(`Storing template for customer: ${customerId}`);

            // Encrypt template data
            const encryptedTemplate = this.secureEncryption.encryptTemplate(templateData, customerId);

            // Store biometric template only
            this.localDB.storeTemplate({
                customer_id: customerId,
                finger_position: fingerPosition,
                template_data: encryptedTemplate,
                quality_score: qualityScore
            });

            this.logger.info(`Template stored successfully for customer: ${customerId}`);
            return { success: true, message: 'Template stored successfully' };

        } catch (error) {
            this.logger.error('Failed to store template locally:', error.message);
            throw new Error('Failed to store template: ' + error.message);
        }
    }

    // Fetch templates from local database
    fetchTemplatesFromLocalDatabase() {
        try {
            this.logger.info('Fetching templates from local database...');

            const templates = this.localDB.getAllTemplates();
            this.logger.info(`Fetched ${templates.length} templates from local database`);

            return templates;
        } catch (error) {
            this.logger.error('Error fetching templates from local database:', error.message);
            throw new Error('Failed to fetch templates from local database: ' + error.message);
        }
    }

    // Legacy method - fetch templates from remote database
    async fetchTemplatesFromDatabase(authToken) {
        try {
            this.logger.info('Fetching templates from database...');

            let apiUrl = `${this.apiURL}/biometrics/get-templates`;
            this.logger.info('Using templates API:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Suprema-Proxy-BiometricService/1.0',
                    'Authorization': authToken ? authToken : ''
                },
                signal: AbortSignal.timeout(10000)
            });

            console.log('Response from templates API:', response.status);

            if (!response.ok) {
                throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
            }
            const templates = await response.json();
            this.logger.info(`Fetched ${templates.length} templates from database`);
            return templates;
        } catch (error) {
            this.logger.error('Error fetching templates from database:', error.message);
            throw new Error('Failed to fetch templates from database: ' + error.message);
        }
    }

    // Main fingerprint identification process using LOCAL database
    async identifyFingerprint(templateData, authToken = null) {
        let filesToCleanup = [];

        try {
            this.logger.info('Starting fingerprint identification using local database...');

            // 1. Fetch templates from LOCAL database
            const storedTemplates = this.fetchTemplatesFromLocalDatabase();

            if (!storedTemplates || storedTemplates.length === 0) {
                this.logger.warn('No templates found in local database');
                return {
                    success: false,
                    error: 'No templates found in local database',
                    matched: false
                };
            }

            this.logger.info(`Found ${storedTemplates.length} templates in local database`);

            // Save live template
            // Use process.cwd() instead of __dirname for pkg compatibility
            const tempDir = path.join(process.cwd(), 'matcher_temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const probePath = path.join(tempDir, 'probe.tpl');
            fs.writeFileSync(probePath, Buffer.from(templateData, 'base64'));

            // Write all stored templates to disk with decryption
            const galleryListPath = path.join(tempDir, 'gallery_list.txt');
            const idMap = {};
            const galleryPaths = storedTemplates.map((record, index) => {
                let templateData = record.template_data;

                // Decrypt template using secure encryption helper
                try {
                    templateData = this.secureEncryption.safeDecryptTemplate(templateData);
                    this.logger.info(`Template ${index} decrypted successfully for customer ${record.customer_id}`);
                } catch (decryptError) {
                    this.logger.error(`Failed to decrypt template ${index} for customer ${record.customer_id}:`, decryptError.message);

                    // Try legacy decryption as fallback
                    if (this.encryptionHelper) {
                        try {
                            templateData = this.encryptionHelper.safeDecryptTemplate(record.template_data);
                            this.logger.info(`Template ${index} decrypted using legacy method`);
                        } catch (legacyError) {
                            this.logger.warn(`Both encryption methods failed for template ${index}, using raw data`);
                            templateData = record.template_data;
                        }
                    } else {
                        templateData = record.template_data;
                    }
                }

                const filePath = path.join(tempDir, `gallery_${index}.tpl`);
                fs.writeFileSync(filePath, Buffer.from(templateData, 'base64'));
                idMap[index] = record;
                return filePath;
            });
            fs.writeFileSync(galleryListPath, galleryPaths.join('\n'));

            // Call the MatcherCapture app for 1:N identification
            return new Promise((resolve, reject) => {
                const exePath = path.join(process.cwd(), 'MatcherCapture', 'bin', 'Release', 'net6.0-windows', 'MatcherCapture.exe');
                this.logger.info(`Executing MatcherCapture identify: ${exePath}`);
                this.logger.info(`Probe path: ${probePath}`);
                this.logger.info(`Gallery list path: ${galleryListPath}`);
                this.logger.info(`Number of stored templates: ${storedTemplates.length}`);

                execFile(exePath, ['identify', probePath, galleryListPath], {
                    timeout: 30000,
                    cwd: path.dirname(exePath)
                }, async (err, stdout, stderr) => {
                    this.logger.info(`MatcherCapture stdout: ${stdout}`);
                    this.logger.info(`MatcherCapture stderr: ${stderr}`);

                    // Clean up temporary files
                    try {
                        fs.unlinkSync(probePath);
                        fs.unlinkSync(galleryListPath);
                        galleryPaths.forEach((filePath) => {
                            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        });
                    } catch (cleanupErr) {
                        this.logger.warn('Failed to clean up temp files:', cleanupErr);
                    }

                    if (err) {
                        this.logger.error('MatcherCapture identify failed:', err);
                        this.logger.error('Stderr:', stderr);

                        return reject(new Error('Fingerprint identification failed'));
                    }

                    let result;
                    try {
                        result = JSON.parse(stdout.trim());
                    } catch (parseErr) {
                        this.logger.error('Failed to parse MatcherCapture output:', parseErr);
                        return reject(new Error('Invalid MatcherCapture output'));
                    }

                    const matchIndex = result.matchIndex;

                    if (typeof matchIndex !== 'number' || matchIndex === -1) {
                        return resolve({
                            success: true,
                            matched: false,
                            message: 'No match found',
                            data: null,
                            totalTemplates: storedTemplates.length
                        });
                    }

                    const matched = idMap[matchIndex];
                    this.logger.info(`Fingerprint matched: Customer ${matched.customer_id}, Finger: ${matched.finger_name}`);

                    // Get locker access info from remote server (if authToken provided)
                    let lockerAccess = null;
                    if (authToken) {
                        try {
                            lockerAccess = await this.getCustomerLockerAccess(matched.customer_id, authToken);
                        } catch (error) {
                            this.logger.warn('Failed to fetch locker access, proceeding without it:', error.message);
                        }
                    }

                    return resolve({
                        status_code: 200,
                        message: 'Match found in local database',
                        data: {
                            customer_id: matched.customer_id,
                            finger_position: matched.finger_position,
                            match_index: matchIndex,
                            quality_score: matched.quality_score,
                            locker_access: lockerAccess,
                            source: 'local_database'
                        }
                    });
                });
            });

        } catch (error) {
            this.logger.error('Fingerprint identification failed:', error.message);
            return {
                success: false,
                error: error.message,
                matched: false
            };
        }
    }


    //#region Matcher Capture Functions Directly
    async captureFingerprint(sessionId) {
        try {
            const exePath = path.join(process.cwd(), 'MatcherCapture', 'bin', 'Release', 'net6.0-windows', 'MatcherCapture.exe');
            if (!fs.existsSync(exePath)) {
                throw new Error(`MatcherCapture executable not found: ${exePath}`);
            }
            // Always use a session directory
            const sessionDir = path.join(this.tempDir, sessionId || (Date.now() + '_' + Math.random().toString(36).slice(2)));
            if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
            this.logger.info('Starting fingerprint capture:', exePath, 'Session dir:', sessionDir);
            const result = execSync(`"${exePath}" capture "${sessionDir}"`, {
                timeout: 30000,
                encoding: 'utf8'
            });
            this.logger.info('MatcherCapture output:', result);
            // Check for output files in sessionDir
            const bmpPath = path.join(sessionDir, 'fingerprint.bmp');
            const tplPath = path.join(sessionDir, 'fingerprint.tpl');
            if (!fs.existsSync(bmpPath) || !fs.existsSync(tplPath)) {
                throw new Error('Fingerprint image or template not found after capture');
            }
            return {
                bmpPath,
                tplPath,
                bmpBuffer: fs.readFileSync(bmpPath),
                tplBuffer: fs.readFileSync(tplPath),
                sessionDir
            };
        } catch (error) {
            this.logger.error('Fingerprint capture failed:', error.message);
            if (error.code === 'TIMEOUT') {
                throw new Error('Fingerprint capture timed out');
            }
            throw new Error('Fingerprint capture failed: ');
        }
    }

    // Get device info
    async getDeviceInfo() {
        try {
            const exePath = path.join(process.cwd(), 'MatcherCapture', 'bin', 'Release', 'net6.0-windows', 'MatcherCapture.exe');
            if (!fs.existsSync(exePath)) throw new Error('MatcherCapture executable not found');
            const result = execSync(`"${exePath}" deviceInfo`, { encoding: 'utf8', timeout: 15000 });
            return JSON.parse(result);
        } catch (error) {
            this.logger.error('Device info failed:', error.message);
            throw new Error('Device info failed: ' + error.message);
        }
    }

    // List devices
    async listDevices() {
        try {
            const exePath = path.join(process.cwd(), 'MatcherCapture', 'bin', 'Release', 'net6.0-windows', 'MatcherCapture.exe');
            if (!fs.existsSync(exePath)) throw new Error('MatcherCapture executable not found');
            const result = execSync(`"${exePath}" listDevices`, { encoding: 'utf8', timeout: 15000 });
            return JSON.parse(result);
        } catch (error) {
            this.logger.error('List devices failed:', error.message);
            throw new Error('List devices failed: ' + error.message);
        }
    }

    // 1:1 verification
    async verifyTemplates(template1, template2) {
        try {
            const exePath = path.join(process.cwd(), 'MatcherCapture', 'bin', 'Release', 'net6.0-windows', 'MatcherCapture.exe');
            if (!fs.existsSync(exePath)) throw new Error('MatcherCapture executable not found');
            // Save templates to temp files
            const tempDir = this.tempDir;
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const t1 = path.join(tempDir, 'verify1.tpl');
            const t2 = path.join(tempDir, 'verify2.tpl');
            fs.writeFileSync(t1, Buffer.from(template1, 'base64'));
            fs.writeFileSync(t2, Buffer.from(template2, 'base64'));
            const result = execSync(`"${exePath}" verify "${t1}" "${t2}"`, { encoding: 'utf8', timeout: 15000 });
            return JSON.parse(result);
        } catch (error) {
            this.logger.error('Verify failed:', error.message);
            throw new Error('Verify failed: ' + error.message);
        }
    }

    // 1:N identification
    async identifyTemplate(probeTemplate, galleryTemplates) {
        try {
            const exePath = path.join(process.cwd(), 'MatcherCapture', 'bin', 'Release', 'net6.0-windows', 'MatcherCapture.exe');
            if (!fs.existsSync(exePath)) throw new Error('MatcherCapture executable not found');
            const tempDir = this.tempDir;
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const probePath = path.join(tempDir, 'probe.tpl');
            fs.writeFileSync(probePath, Buffer.from(probeTemplate, 'base64'));
            const galleryListPath = path.join(tempDir, 'gallery_list.txt');
            const galleryPaths = [];
            galleryTemplates.forEach((tpl, i) => {
                const p = path.join(tempDir, `gallery_${i}.tpl`);
                fs.writeFileSync(p, Buffer.from(tpl, 'base64'));
                galleryPaths.push(p);
            });
            fs.writeFileSync(galleryListPath, galleryPaths.join('\n'));
            const result = execSync(`"${exePath}" identify "${probePath}" "${galleryListPath}"`, { encoding: 'utf8', timeout: 20000 });
            return JSON.parse(result);
        } catch (error) {
            this.logger.error('Identify failed:', error.message);
            throw new Error('Identify failed: ' + error.message);
        }
    }

    // Quality
    async getQuality({ image, template }) {
        try {
            const exePath = path.join(process.cwd(), 'MatcherCapture', 'bin', 'Release', 'net6.0-windows', 'MatcherCapture.exe');
            if (!fs.existsSync(exePath)) throw new Error('MatcherCapture executable not found');
            const tempDir = this.tempDir;
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            let argPath = '';
            let mode = '';
            if (image) {
                argPath = path.join(tempDir, 'quality.bmp');
                fs.writeFileSync(argPath, Buffer.from(image, 'base64'));
                mode = 'image';
            } else if (template) {
                argPath = path.join(tempDir, 'quality.tpl');
                fs.writeFileSync(argPath, Buffer.from(template, 'base64'));
                mode = 'template';
            } else {
                throw new Error('image or template required');
            }
            const result = execSync(`"${exePath}" quality ${mode} "${argPath}"`, { encoding: 'utf8', timeout: 10000 });
            return JSON.parse(result);
        } catch (error) {
            this.logger.error('Quality failed:', error.message);
            throw new Error('Quality failed: ' + error.message);
        }
    }

    // Session management
    async createSession(sessionId) {
        try {
            const sessionDir = path.join(this.tempDir, sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            this.logger.info(`Session created: ${sessionDir}`);
            return { success: true, sessionDir };
        } catch (error) {
            this.logger.error('Create session failed:', error.message);
            throw new Error('Create session failed: ' + error.message);
        }
    }

    async cleanupSession(sessionId) {
        try {
            const sessionDir = path.join(this.tempDir, sessionId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                this.logger.info(`Session cleaned up: ${sessionDir}`);
            }
            return { success: true };
        } catch (error) {
            this.logger.error('Cleanup session failed:', error.message);
            throw new Error('Cleanup session failed: ' + error.message);
        }
    }

    //#endregion
}

module.exports = BiometricService;
