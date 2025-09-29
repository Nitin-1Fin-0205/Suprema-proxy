const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class LocalBiometricDB {
    constructor(dbPath, encryptionKey, logger) {
        // Ensure data directory exists
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.logger = logger;
        this.encryptionKey = encryptionKey;

        try {
            this.db = new Database(dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            this.initTables();
            this.logger.info(`Local biometric database initialized: ${dbPath}`);
        } catch (error) {
            this.logger.error('Failed to initialize local database:', error.message);
            throw error;
        }
    }

    initTables() {
        try {
            // Single table for biometric templates only
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS biometric_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id TEXT NOT NULL,
                    finger_position TEXT NOT NULL,
                    template_data TEXT NOT NULL,
                    quality_score INTEGER DEFAULT 0,
                    isactive INTEGER BOOLEAN DEFAULT true,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Create essential index for fast customer lookup
            this.db.exec(`
                CREATE INDEX IF NOT EXISTS idx_customer_id ON biometric_templates(customer_id);
            `);

            this.logger.info('Database table initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize database table:', error.message);
            throw error;
        }
    }

    // Store biometric template data
     storeTemplate(templateData) {
        try {
            const existing =  this.db.prepare(`
                SELECT id FROM biometric_templates 
                WHERE customer_id = ? AND isactive = true AND finger_position = ?
            `).get(templateData.customer_id, templateData.finger_position);

            console.log(existing);

            if (existing) {
                this.logger.info(`Template already exists for customer: ${templateData.customer_id}, finger: ${templateData.finger_position}`);

                const updateStmt = this.db.prepare(`
                    UPDATE biometric_templates 
                    SET isactive = false, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? 
                `);
                updateStmt.run(existing.id);
            }
            console.log(this.db.prepare(`
                SELECT id FROM biometric_templates 
                WHERE customer_id = ? AND isactive = true AND finger_position = ?
            `).get(templateData.customer_id, templateData.finger_position))

            const stmt = this.db.prepare(`
                INSERT INTO biometric_templates 
                (customer_id, finger_position, template_data, quality_score, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);

            stmt.run(
                templateData.customer_id,
                templateData.finger_position,
                templateData.template_data,
                templateData.quality_score || 0
            );

            this.logger.info(`Template stored: ${templateData.customer_id} - ${templateData.finger_position}`);
        } catch (error) {
            this.logger.error('Failed to store template:', error.message);
            throw error;
        }
    }

    // Get all templates for matching
    getAllTemplates() {
        try {
            const stmt = this.db.prepare(`
                SELECT id, customer_id, finger_position, template_data, quality_score, created_at
                FROM biometric_templates
                WHERE isactive = true
                ORDER BY created_at ASC
            `);
            const templates = stmt.all();
            this.logger.info(`Retrieved ${templates.length} templates from database`);
            return templates;
        } catch (error) {
            this.logger.error('Failed to get templates:', error.message);
            throw error;
        }
    }

    // Get templates for specific customer
    getCustomerTemplates(customerId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM biometric_templates 
                WHERE customer_id = ? AND isactive = true
                ORDER BY created_at ASC
            `);
            const templates = stmt.all(customerId);
            this.logger.info(`Retrieved ${templates.length} templates for customer: ${customerId}`);
            return templates;
        } catch (error) {
            this.logger.error('Failed to get customer templates:', error.message);
            throw error;
        }
    }

    // Simple close method
    close() {
        try {
            if (this.db) {
                this.db.close();
                this.logger.info('Database connection closed');
            }
        } catch (error) {
            this.logger.error('Error closing database:', error.message);
        }
    }
}

module.exports = LocalBiometricDB;