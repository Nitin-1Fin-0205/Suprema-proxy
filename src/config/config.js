// src/config/config.js
const path = require('path');

module.exports = {
    allowedOrigins: [
        'http://localhost:5173',
        'https://localhost:5173',
        'https://newuat.eos.onefin.app',
        'https://lms.onefin.app',
        'https://uat.lms.onefin.app',
        'http://localhost:3000',
        'http://localhost:8080',
    ],
    targetServer: process.env.TARGET_SERVER || 'http://127.0.0.1:8084',
    port: process.env.PORT || 4000,
    isDevelopment: process.env.NODE_ENV !== 'production',
    logDir: path.join(process.cwd(), 'logs'),
    certDir: path.join(process.cwd(), 'certs'),
};
