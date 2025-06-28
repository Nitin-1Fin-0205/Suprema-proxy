// src/logger/logger.js
const fs = require('fs');
const path = require('path');

class Logger {
    constructor(logDir) {
        this.logDir = logDir;
        this.ensureLogDir();
    }

    ensureLogDir() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.warn('Could not create logs directory:', error.message);
            this.logDir = null;
        }
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            pid: process.pid
        };
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
        if (this.logDir) {
            try {
                const logFile = path.join(this.logDir, `secure-proxy-${new Date().toISOString().split('T')[0]}.log`);
                fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
            } catch (error) {
                console.warn('Could not write to log file:', error.message);
            }
        }
    }

    info(message, data) { this.log('info', message, data); }
    error(message, data) { this.log('error', message, data); }
    warn(message, data) { this.log('warn', message, data); }
}

module.exports = Logger;
