// src/utils/encryption.helper.js
const crypto = require('crypto');

class BiometricEncryptionHelper {
    constructor() {
        this.algorithm = 'aes-256-cbc';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16;  // 128 bits

        const biometricMasterKey = "fbe8db54bba6d9b1782ce14d6aebe2786462aa612e07901e0250cb7ccab4d2c9";

        // In production, store this in environment variables
        if (!biometricMasterKey) {
            throw new Error('BIOMETRIC_MASTER_KEY environment variable is required');
        }

        // Convert hex string to buffer
        this.masterKey = Buffer.from(biometricMasterKey, 'hex');

        // Validate key length (should be 32 bytes for AES-256)
        if (this.masterKey.length !== this.keyLength) {
            throw new Error(`Invalid master key length. Expected ${this.keyLength} bytes, got ${this.masterKey.length} bytes`);
        }
    }

    /**
     * Encrypt biometric template data
     * @param {string} templateData - Base64 encoded template data
     * @returns {string} - Encrypted data as base64
     */
    encryptTemplate(templateData) {
        try {
            // Generate a random IV for each encryption
            const iv = crypto.randomBytes(this.ivLength);

            // Create cipher with Uint8Array conversion
            const cipher = crypto.createCipheriv(this.algorithm, new Uint8Array(this.masterKey), new Uint8Array(iv));

            // Encrypt the template
            let encrypted = cipher.update(templateData, 'base64', 'hex');
            encrypted += cipher.final('hex');

            // Combine IV + encrypted data
            const combined = iv.toString('hex') + ':' + encrypted;

            return Buffer.from(combined).toString('base64');
        } catch (error) {
            throw new Error(`Template encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt biometric template data
     * @param {string} encryptedData - Encrypted data as base64
     * @returns {string} - Decrypted template data as base64
     */
    decryptTemplate(encryptedData) {
        try {
            // Decode from base64
            const combined = Buffer.from(encryptedData, 'base64').toString();

            // Split IV and encrypted data
            const parts = combined.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted data format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];

            // Create decipher with Uint8Array conversion
            const decipher = crypto.createDecipheriv(this.algorithm, new Uint8Array(this.masterKey), new Uint8Array(iv));

            // Decrypt
            let decrypted = decipher.update(encrypted, 'hex', 'base64');
            decrypted += decipher.final('base64');

            return decrypted;
        } catch (error) {
            throw new Error(`Template decryption failed: ${error.message}`);
        }
    }

    /**
     * Check if data is encrypted (simple check)
     * @param {string} data - Data to check
     * @returns {boolean} - True if data appears to be encrypted
     */
    isEncrypted(data) {
        try {
            const decoded = Buffer.from(data, 'base64').toString();
            return decoded.includes(':') && decoded.split(':').length === 2;
        } catch {
            return false;
        }
    }

    /**
     * Safely decrypt template data, returns original if not encrypted
     * @param {string} templateData - Template data that may or may not be encrypted
     * @returns {string} - Decrypted template data as base64
     */
    safeDecryptTemplate(templateData) {
        if (!templateData) {
            throw new Error('Template data is required');
        }

        // Check if the data is encrypted
        if (this.isEncrypted(templateData)) {
            return this.decryptTemplate(templateData);
        }

        // If not encrypted, return as is
        return templateData;
    }
}

module.exports = BiometricEncryptionHelper;
