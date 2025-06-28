// src/services/biometric.service.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const fetch = require('node-fetch');

class BiometricService {
    constructor(logger, config) {
        this.apiURL = config && config.apiURL ? config.apiURL : 'https://newuat.support-backend.onefin.app';
        this.logger = logger;
        this.tempDir = path.join(process.cwd(), 'temp_templates');
        this.matcherPath = path.join(process.cwd(), 'MatcherIdentify', 'bin', 'Release', 'net6.0', 'MatcherIdentify.exe');
    }

    async executematcher(liveTemplatePath, dbListPath) {
        try {
            this.logger.info('Executing fingerprint matcher...');
            if (!fs.existsSync(this.matcherPath)) {
                throw new Error(`Matcher executable not found: ${this.matcherPath}`);
            }
            const command = `"${this.matcherPath}" "${liveTemplatePath}" "${dbListPath}"`;
            this.logger.info('Matcher command:', command);
            const result = execSync(command, {
                timeout: 30000,
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

    async getCustomerLockerAccess(customerId) {
        try {
            const apiEndpoint = `${this.apiURL}/biometrics/get-matched-customer-locker?customerId=${customerId}`;
            this.logger.info('Calling external API for locker access:', apiEndpoint);
            const response = await fetch(apiEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('API call failed: ' + response.statusText);
            }
            return await response.json();
        } catch (error) {
            this.logger.error('External API call failed:', error.message);
            throw error;
        }
    }

    async identifyFingerprint(liveTemplate) {
        // ...existing logic for fingerprint identification...
        // This is a placeholder for the actual implementation
        return { success: true, matched: true, customerId: '12345' };
    }
}

module.exports = BiometricService;
