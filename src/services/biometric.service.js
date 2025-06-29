// src/services/biometric.service.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync, execFile } = require('child_process');

class BiometricService {
    constructor(logger, config) {
        this.apiURL = config && config.apiURL ? config.apiURL : 'https://newuat.support-backend.onefin.app';
        this.logger = logger;
        this.tempDir = path.join(process.cwd(), 'temp_templates');
    }

    // Call external API with match result
    async getCustomerLockerAccess(customerId) {
        try {
            const apiEndpoint = `${this.apiURL}/biometrics/get-matched-customer-locker?customerId=${customerId}`;

            this.logger.info('Calling external API for locker access:', apiEndpoint);
            const response = await fetch(apiEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Suprema-Proxy-BiometricService/1.0'
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

    async fetchTemplatesFromDatabase() {
        try {
            this.logger.info('Fetching templates from database...');

            let apiUrl = `${this.apiURL}/biometrics/get-templates`;
            this.logger.info('Using templates API:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Suprema-Proxy-BiometricService/1.0'
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

    // Main fingerprint identification process
    async identifyFingerprint(templateData) {
        let filesToCleanup = [];

        try {
            // 1. Fetch templates from database
            const storedTemplates = await this.fetchTemplatesFromDatabase();

            if (!storedTemplates || storedTemplates.length === 0) {
                return {
                    success: false,
                    error: 'No templates found in database',
                    matched: false
                };
            }

            // Save live template
            // Use process.cwd() instead of __dirname for pkg compatibility
            const tempDir = path.join(process.cwd(), 'matcher_temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const probePath = path.join(tempDir, 'probe.tpl');
            fs.writeFileSync(probePath, Buffer.from(templateData, 'base64'));

            // Write all stored templates to disk
            const galleryListPath = path.join(tempDir, 'gallery_list.txt');
            const idMap = {};
            const galleryPaths = storedTemplates.map((record, index) => {
                const filePath = path.join(tempDir, `gallery_${index}.tpl`);
                fs.writeFileSync(filePath, Buffer.from(record.template_data, 'base64'));
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
                    const lockerAccess = await this.getCustomerLockerAccess(matched.customer_id);

                    return resolve({
                        status_code: 200,
                        message: 'Match found',
                        data: {
                            customer_id: matched.customer_id,
                            finger_name: matched.finger_name,
                            match_index: matchIndex,
                            locker_access: lockerAccess,
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
