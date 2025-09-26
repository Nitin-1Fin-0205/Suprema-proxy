const crypto = require('crypto');

class SecureBiometricEncryption {
    constructor(logger) {
        this.logger = logger;
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 12;
        this.saltLength = 16;
        this.tagLength = 16;

        // Initialize master key from environment or generate new one
        this.initializeMasterKey();
    }

    initializeMasterKey() {
        // Get master key from environment variable or generate new one
        const envKey = process.env.BIOMETRIC_MASTER_KEY;
        console.log('Environment key:', envKey ? 'Found' : 'Not found');

        if (envKey) {
            this.masterKey = Buffer.from(envKey, 'hex');
            this.logger.info('Biometric master key loaded from environment');
        }
        // else {
        //     // Generate new master key and warn user to save it
        //     this.masterKey = crypto.randomBytes(this.keyLength);
        //     const keyHex = this.masterKey.toString('hex');

        //     this.logger.warn('NEW MASTER KEY GENERATED - SAVE THIS TO ENVIRONMENT:');
        //     this.logger.warn(`BIOMETRIC_MASTER_KEY=${keyHex}`);
        //     this.logger.warn('Without this key, existing templates cannot be decrypted!');
        // }
    }

    // Enhanced template encryption with customer-specific salt
    encryptTemplate(templateData, customerId = null) {
        try {
            // Generate or derive customer-specific salt
            const customerSalt = customerId ?
                crypto.createHash('sha256').update(`${customerId}_salt`).digest().slice(0, this.saltLength) :
                crypto.randomBytes(this.saltLength);

            // Derive key using PBKDF2
            const derivedKey = crypto.pbkdf2Sync(
                this.masterKey,
                customerSalt,
                100000, // iterations
                this.keyLength,
                'sha256'
            );

            // Generate random IV
            const iv = crypto.randomBytes(this.ivLength);

            // Create cipher for AES-GCM
            const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);

            // Encrypt template data
            let encrypted = cipher.update(templateData, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Get authentication tag
            const tag = cipher.getAuthTag();

            // Combine salt:iv:tag:encrypted
            const combined = customerSalt.toString('hex') + ':' +
                iv.toString('hex') + ':' +
                tag.toString('hex') + ':' +
                encrypted;

            // Return base64 encoded result
            return Buffer.from(combined).toString('base64');

        } catch (error) {
            this.logger.error('Template encryption failed:', error.message);
            throw new Error('Template encryption failed: ' + error.message);
        }
    }

    // Decrypt template data
    decryptTemplate(encryptedData) {
        try {
            // Decode from base64
            const combined = Buffer.from(encryptedData, 'base64').toString();

            // Split components
            const parts = combined.split(':');
            if (parts.length !== 4) {
                throw new Error('Invalid encrypted template format');
            }

            const salt = Buffer.from(parts[0], 'hex');
            const iv = Buffer.from(parts[1], 'hex');
            const tag = Buffer.from(parts[2], 'hex');
            const encrypted = parts[3];

            // Derive the same key
            const derivedKey = crypto.pbkdf2Sync(
                this.masterKey,
                salt,
                100000,
                this.keyLength,
                'sha256'
            );

            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv);
            decipher.setAuthTag(tag);

            // Decrypt
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;

        } catch (error) {
            this.logger.error('Template decryption failed:', error.message);
            throw new Error('Template decryption failed: ' + error.message);
        }
    }

    // Safe decrypt that handles both encrypted and unencrypted templates
    safeDecryptTemplate(templateData) {
        try {
            // Check if data looks encrypted (base64 with specific format)
            if (this.isEncryptedTemplate(templateData)) {
                return this.decryptTemplate(templateData);
            } else {
                // Return as-is if not encrypted (backward compatibility)
                this.logger.info('Template appears to be unencrypted, using as-is');
                return templateData;
            }
        } catch (error) {
            this.logger.warn('Decryption failed, using original data:', error.message);
            return templateData;
        }
    }

    // Check if template data is encrypted
    isEncryptedTemplate(data) {
        try {
            if (!data || typeof data !== 'string') return false;

            // Decode and check format
            const decoded = Buffer.from(data, 'base64').toString();
            const parts = decoded.split(':');

            // Should have 4 parts: salt:iv:tag:encrypted
            return parts.length === 4 &&
                parts[0].length === this.saltLength * 2 && // salt hex length
                parts[1].length === this.ivLength * 2;     // iv hex length
        } catch (error) {
            return false;
        }
    }

    // Generate database encryption key
    generateDBKey() {
        const envKey = process.env.LOCAL_DB_KEY;
        if (envKey) {
            return envKey;
        }

        // Generate new key
        const newKey = crypto.randomBytes(32).toString('hex');
        this.logger.warn('NEW DB KEY GENERATED - SAVE THIS TO ENVIRONMENT:');
        this.logger.warn(`LOCAL_DB_KEY=${newKey}`);

        return newKey;
    }

    // Hash template for quick comparison (without decryption)
    hashTemplate(templateData) {
        return crypto.createHash('sha256').update(templateData).digest('hex');
    }

    // Validate encryption setup
    validateEncryption() {
        try {
            const testData = 'test_template_data';
            const encrypted = this.encryptTemplate(testData);
            const decrypted = this.decryptTemplate(encrypted);

            const isValid = decrypted === testData;
            this.logger.info(`Encryption validation: ${isValid ? 'PASSED' : 'FAILED'}`);

            return isValid;
        } catch (error) {
            this.logger.error('Encryption validation failed:', error.message);
            return false;
        }
    }
}

module.exports = SecureBiometricEncryption;