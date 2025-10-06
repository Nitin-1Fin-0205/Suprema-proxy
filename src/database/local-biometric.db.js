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
        this.backupDir = path.join(path.dirname(dbPath), 'backups');
        this.dbPath = dbPath;

        try {
            this.db = new Database(dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            this.initTables();
            this.ensureBackupDirectory();
            this.scheduleAutoBackup();
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

    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            this.logger.info(`Backup directory created: ${this.backupDir}`);
        }
    }

    async createDailyBackupIfNeeded(reason = 'daily') {
        try {
            const today = new Date().toDateString();

            // Check if backup already exists for today
            const todayBackupExists = this.checkBackupExistsForToday();

            if (todayBackupExists) {
                this.logger.info(`Daily backup already exists for ${today}, skipping`);
                return null;
            }

            // Create today's backup
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const backupPath = path.join(this.backupDir, `biometric_${reason}_${timestamp}.db`);

            // Use SQLite's backup method instead of file copy for WAL mode
            await this.createSQLiteBackup(backupPath);

            this.logger.info(`Daily backup created: ${backupPath}`);
            this.cleanOldBackups();
            return backupPath;
        } catch (error) {
            this.logger.error('Daily backup creation failed:', error.message);
            throw error;
        }
    }
    // Check if backup exists for today
    checkBackupExistsForToday() {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('biometric_') && file.endsWith('.db'))
                .filter(file => file.includes(today));

            return backupFiles.length > 0;
        } catch (error) {
            return false;
        }
    }

    // Clean old backups (keep last 30 for daily backups)
    cleanOldBackups() {
        try {
            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('biometric_') && file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    mtime: fs.statSync(path.join(this.backupDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            // Keep only the latest 30 backups (30 days worth)
            if (backupFiles.length > 30) {
                const filesToDelete = backupFiles.slice(30);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    this.logger.info(`Old backup deleted: ${file.name}`);
                });
            }
        } catch (error) {
            this.logger.error('Failed to clean old backups:', error.message);
        }
    }

    // Schedule automatic backups
    scheduleAutoBackup() {
        // Create startup backup only if no backup exists for today
        setTimeout(() => {
            this.createDailyBackupIfNeeded('startup').catch(err => {
                this.logger.error('Startup backup failed:', err.message);
            });
        }, 5000);

        // Check for daily backup every hour
        setInterval(() => {
            this.createDailyBackupIfNeeded('daily').catch(err => {
                this.logger.error('Daily backup failed:', err.message);
            });
        }, 60 * 60 * 1000); // Every hour

    }

    // Create manual backup using SQLite backup method
    async createBackup(reason = 'manual') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `biometric_${reason}_${timestamp}.db`);

            // Use SQLite's backup method for proper WAL mode backup
            await this.createSQLiteBackup(backupPath);

            this.logger.info(`Manual backup created: ${backupPath}`);
            this.cleanOldBackups();
            return backupPath;
        } catch (error) {
            this.logger.error('Manual backup creation failed:', error.message);
            throw error;
        }
    }

    // Proper SQLite backup method that works with WAL mode
    async createSQLiteBackup(backupPath) {
        return new Promise((resolve, reject) => {
            try {
                // Use better-sqlite3's backup method with destination path
                const backup = this.db.backup(backupPath);

                // Step through the backup process
                backup.step(-1); // Copy all pages at once
                backup.finish();

                // Verify backup was created and has content
                const stats = fs.statSync(backupPath);
                if (stats.size === 0) {
                    fs.unlinkSync(backupPath); // Delete empty file
                    throw new Error('Backup file is empty');
                }

                this.logger.info(`Backup created successfully: ${backupPath} (${stats.size} bytes)`);
                resolve(backupPath);
            } catch (error) {
                this.logger.error('SQLite backup failed:', error.message);
                reject(error);
            }
        });
    }

    getLastBackupDate() {
        try {
            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('biometric_'))
                .map(file => fs.statSync(path.join(this.backupDir, file)).mtime)
                .sort((a, b) => b - a);

            return backupFiles.length > 0 ? backupFiles[0].toDateString() : null;
        } catch {
            return null;
        }
    }

    // Store biometric template data
    storeTemplate(templateData) {
        try {
            const existing = this.db.prepare(`
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

    // Get backup information
    getBackupInfo() {
        try {
            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('biometric_') && file.endsWith('.db'))
                .map(file => {
                    const filePath = path.join(this.backupDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.mtime,
                        reason: file.split('_')[1] || 'unknown'
                    };
                })
                .sort((a, b) => b.created - a.created);

            return {
                total_backups: backupFiles.length,
                backup_directory: this.backupDir,
                latest_backup: backupFiles[0] || null,
                backups: backupFiles
            };
        } catch (error) {
            this.logger.error('Failed to get backup info:', error.message);
            return {
                total_backups: 0,
                backup_directory: this.backupDir,
                latest_backup: null,
                backups: [],
                error: error.message
            };
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