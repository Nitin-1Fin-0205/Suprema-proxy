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

        // Method 1: Use certutil (most reliable on Windows)
        try {
            const certutilCmd = `certutil -addstore -f "Root" "${certPath}"`;
            execSync(certutilCmd, { stdio: 'ignore', timeout: 15000 });
            logger.info('✅ Certificate automatically trusted via certutil');
            return true;
        } catch (certutilError) {
            logger.warn('certutil failed, trying PowerShell method...');
        }

        // Method 2: PowerShell fallback
        try {
            const powershellCmd = `Import-Certificate -FilePath \"${certPath}\" -CertStoreLocation Cert:\\LocalMachine\\Root`;
            execSync(`powershell -Command "${powershellCmd}"`, { stdio: 'ignore', timeout: 15000 });
            logger.info('✅ Certificate automatically trusted via PowerShell');
            return true;
        } catch (psError) {
            logger.warn('PowerShell import failed');
        }

        // Method 3: Try elevated PowerShell
        try {
            const elevatedCmd = `powershell -Command "Start-Process powershell -ArgumentList '-Command Import-Certificate -FilePath \\\"${certPath}\\\" -CertStoreLocation Cert:\\\\LocalMachine\\\\Root' -Verb RunAs -Wait"`;
            execSync(elevatedCmd, { stdio: 'ignore', timeout: 20000 });
            logger.info('✅ Certificate automatically trusted via elevated PowerShell');
            return true;
        } catch (elevatedError) {
            logger.warn('Elevated PowerShell import failed');
        }

        logger.warn('❌ Could not auto-trust certificate (requires admin privileges)');
        logger.info('💡 To manually trust: Run as Administrator and execute: npm run trust-cert');
        return false;
    } catch (error) {
        logger.warn('Certificate trust process failed:', error.message);
        return false;
    }
}
module.exports = { ensureCertificatesExist, autoTrustCertificate };
