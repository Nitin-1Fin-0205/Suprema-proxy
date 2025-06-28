// src/utils/certificates.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function ensureCertificatesExist(certDir, logger) {
    const keyPath = path.join(certDir, 'localhost.key');
    const certPath = path.join(certDir, 'localhost.crt');
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        logger.info('SSL certificates found - using pre-generated certificates');
        return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
    }
    logger.error('SSL certificates not found!');
    logger.error('Required files missing:');
    logger.error(`  - ${keyPath}`);
    logger.error(`  - ${certPath}`);
    logger.error('SOLUTION: Copy your pre-generated certificates to the certs/ directory');
    process.exit(1);
}

function autoTrustCertificate(certDir, logger) {
    const certPath = path.join(certDir, 'localhost.crt');
    if (!fs.existsSync(certPath)) {
        logger.warn('Certificate file not found, cannot auto-trust');
        return false;
    }
    try {
        logger.info('Attempting to auto-trust SSL certificate...');
        try {
            execSync(`certlm.exe -add -c "${certPath}" -s -r localMachine root`, { stdio: 'ignore', timeout: 10000 });
            logger.info('✅ Certificate automatically trusted system-wide');
            return true;
        } catch {
            logger.warn('certlm.exe failed, trying PowerShell method...');
        }
        try {
            const powershellCmd = `Import-Certificate -FilePath \"${certPath}\" -CertStoreLocation Cert:\\LocalMachine\\Root`;
            execSync(`powershell -Command "${powershellCmd}"`, { stdio: 'ignore', timeout: 10000 });
            logger.info('✅ Certificate automatically trusted via PowerShell');
            return true;
        } catch {
            logger.warn('PowerShell import failed');
        }
        logger.warn('❌ Could not auto-trust certificate (requires admin privileges)');
        return false;
    } catch (error) {
        logger.warn('Certificate trust process failed:', error.message);
        return false;
    }
}

module.exports = { ensureCertificatesExist, autoTrustCertificate };
