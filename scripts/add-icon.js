// add-icon.js - Adds an icon to the executable without requiring user input
const rcedit = require('rcedit');
const path = require('path');
const fs = require('fs');

// Determine which executable to modify based on the build script that was run
let exePath;
if (fs.existsSync(path.join(process.cwd(), 'dist', 'suprema-secure-proxy.exe'))) {
    exePath = path.join(process.cwd(), 'dist', 'suprema-secure-proxy.exe');
} else if (fs.existsSync(path.join(process.cwd(), 'production-deployment', 'suprema-secure-proxy.exe'))) {
    exePath = path.join(process.cwd(), 'production-deployment', 'suprema-secure-proxy.exe');
} else {
    console.error('❌ Error: Could not find executable to modify');
    // process.exit(1);
}

const iconPath = path.join(process.cwd(), 'assets', 'app-icon.ico');

// Check if icon exists
if (!fs.existsSync(iconPath)) {
    console.error(`❌ Error: Icon file not found at ${iconPath}`);
    // process.exit(1);
}

console.log(`📦 Adding icon to executable: ${path.basename(exePath)}`);

// Add icon to executable without requiring user input
rcedit(exePath, {
    icon: iconPath,
    'version-string': {
        ProductName: 'Suprema Secure Proxy',
        FileDescription: 'Secure HTTPS Proxy for Suprema Biometric Devices',
        CompanyName: 'Suprema',
        LegalCopyright: '© 2023 Suprema Inc.',
        OriginalFilename: 'suprema-secure-proxy.exe',
        FileVersion: '1.0.0',
        ProductVersion: '1.0.0'
    }
})
    .then(() => {
        console.log('✅ Icon added successfully!');
    })
    .catch(error => {
        console.error(`❌ Error adding icon: ${error.message}`);
        // process.exit(1);
    });