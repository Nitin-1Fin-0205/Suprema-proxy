const fs = require('fs');
const path = require('path');
const { execSync, execFile } = require('child_process');
const https = require('https');
const http = require('http');

class BiometricService {
    constructor(logger) {
        this.apiURL = 'https://newuat.support-backend.onefin.app';
        this.logger = logger;
        // Use process.cwd() instead of relative path for pkg compatibility
        this.tempDir = path.join(process.cwd(), 'temp_templates');
        this.matcherPath = path.join(process.cwd(), 'MatcherIdentify', 'bin', 'Release', 'net6.0', 'MatcherIdentify.exe');
    }

    // Execute matcher and get result
    async executematcher(liveTemplatePath, dbListPath) {
        try {
            this.logger.info('Executing fingerprint matcher...');

            // Check if matcher executable exists
            if (!fs.existsSync(this.matcherPath)) {
                throw new Error(`Matcher executable not found: ${this.matcherPath}`);
            }

            // Execute the matcher with timeout
            const command = `"${this.matcherPath}" "${liveTemplatePath}" "${dbListPath}"`;
            this.logger.info('Matcher command:', command);

            const result = execSync(command, {
                timeout: 30000, // 30 second timeout
                encoding: 'utf8'
            }).trim();

            const matchedIndex = parseInt(result);
            this.logger.info('Matcher result:', matchedIndex);

            return matchedIndex;

        } catch (error) {
            this.logger.error('Matcher execution failed:', error.message);

            if (error.code === 'TIMEOUT') {
                throw new Error('Matcher execution timed out');
            }

            throw new Error('Matcher execution failed: ' + error.message);
        }
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

            console.log('Fetched templates:', storedTemplates);

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

            const livePath = path.join(tempDir, 'live.dat');
            fs.writeFileSync(livePath, Buffer.from(templateData, 'base64'));

            // Write all stored templates to disk
            const dbListPath = path.join(tempDir, 'db_list.txt');
            const idMap = {};
            const dbListContent = storedTemplates.map((record, index) => {
                const filePath = path.join(tempDir, `db_${index}.dat`);
                fs.writeFileSync(filePath, Buffer.from(record.template_data, 'base64'));
                idMap[index] = record;
                return filePath;
            }).join('\n');
            fs.writeFileSync(dbListPath, dbListContent);

            // Call the C# matcher app for 1:N identification
            return new Promise((resolve, reject) => {
                const matcherPath = path.join(process.cwd(), 'MatcherIdentify/bin/Release/net6.0/MatcherIdentify.exe');
                this.logger.info(`Executing matcher: ${matcherPath}`);
                this.logger.info(`Live template path: ${livePath}`);
                this.logger.info(`DB list path: ${dbListPath}`);
                this.logger.info(`Number of stored templates: ${storedTemplates.length}`);

                execFile(matcherPath, [livePath, dbListPath], {
                    timeout: 30000,
                    cwd: path.dirname(matcherPath)  // Run from the matcher's directory
                }, async (err, stdout, stderr) => {
                    this.logger.info(`Matcher stdout: ${stdout}`);
                    this.logger.info(`Matcher stderr: ${stderr}`);

                    // Clean up temporary files
                    try {
                        fs.unlinkSync(livePath);
                        fs.unlinkSync(dbListPath);
                        storedTemplates.forEach((_, index) => {
                            const filePath = path.join(tempDir, `db_${index}.dat`);
                            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        });
                    } catch (cleanupErr) {
                        this.logger.warn('Failed to clean up temp files:', cleanupErr);
                    }

                    if (err) {
                        this.logger.error('Matcher execution failed:', err);
                        this.logger.error('Stderr:', stderr);

                        return reject(new Error('Fingerprint identification failed'));
                    }

                    const result = stdout.trim();
                    const matchedIndex = parseInt(result);

                    if (isNaN(matchedIndex) || matchedIndex === -1) {
                        return resolve({
                            success: true,
                            matched: false,
                            message: 'No match found',
                            data: null,
                            totalTemplates: storedTemplates.length
                        });
                    }                    // Return matched customer
                    const matched = idMap[matchedIndex];
                    const lockerAccess = await this.getCustomerLockerAccess(matched.customer_id);

                    return resolve({
                        status_code: 200,
                        message: 'Match found',
                        data: {
                            customer_id: matched.customer_id,
                            finger_name: matched.finger_name,
                            match_index: matchedIndex,
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

    // Cleanup template files after processing
    cleanupSessionFiles(filePaths) {
        try {
            filePaths.forEach(filePath => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    this.logger.info('Cleaned up file:', path.basename(filePath));
                }
            });
        } catch (error) {
            this.logger.warn('Error during file cleanup:', error.message);
        }
    }

    // Clean up old template files (older than 1 hour)
    cleanupOldTemplates() {
        try {
            // Use process.cwd() for pkg compatibility
            const tempDirs = [
                path.join(process.cwd(), 'temp_templates'),
                path.join(process.cwd(), 'matcher_temp')
            ];

            tempDirs.forEach(tempDir => {
                if (!fs.existsSync(tempDir)) return;

                const files = fs.readdirSync(tempDir);
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;

                files.forEach(file => {
                    const filePath = path.join(tempDir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (now - stats.mtime.getTime() > oneHour) {
                            fs.unlinkSync(filePath);
                            this.logger.info('Cleaned up old template file:', file);
                        }
                    } catch (error) {
                        this.logger.warn('Error cleaning up file:', file, error.message);
                    }
                });
            });
        } catch (error) {
            this.logger.warn('Error during cleanup:', error.message);
        }
    }
}

module.exports = BiometricService;
