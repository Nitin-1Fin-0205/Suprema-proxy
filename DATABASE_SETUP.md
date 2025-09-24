# Suprema Biometric Proxy - Local Database Setup

## Overview
This implements a simple local SQLite database for storing only biometric templates with high-security encryption. Customer details (name, email, phone) remain on your server - only biometric data is stored locally for fast offline authentication.

## Features

### 1. Local Biometric Storage
- **SQLite with WAL mode** for better performance and reliability
- **AES-256-GCM encryption** for template data
- **PBKDF2 key derivation** with 100,000 iterations
- **Customer-specific salts** for enhanced security
- **Single table design** - no complex relationships

### 2. Security Enhancements
- **Template-level encryption** with customer-specific salts
- **Secure key management** via environment variables
- **No personal data stored locally** - only biometric templates
- **Backward compatibility** with existing encryption methods

### 3. Simple Management
- **Store by customer ID** - reference to your server data
- **Fast local matching** - no network dependency for authentication
- **Minimal data footprint** - only essential biometric data

## Installation

1. **Install Dependencies**
   ```bash
   npm install better-sqlite3 --save
   ```

2. **Create Environment File**
   ```bash
   cp .env.example .env
   ```

3. **Generate Encryption Keys**
   ```bash
   # Generate 256-bit keys (64 hex characters each)
   node -e "console.log('LOCAL_DB_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
   node -e "console.log('BIOMETRIC_MASTER_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Update .env File**
   ```env
   LOCAL_DB_KEY=your-generated-db-key-here
   BIOMETRIC_MASTER_KEY=your-generated-template-key-here
   ```

## Directory Structure
```
Suprema-proxy/
├── data/                          # Database files
│   └── biometric.db              # Main SQLite database
├── src/
│   ├── database/
│   │   └── local-biometric.db.js # Simple database management
│   ├── utils/
│   │   └── secure-encryption.helper.js  # Template encryption
│   └── services/
│       └── biometric.service.js  # Updated service (modified)
├── .env                         # Environment configuration
└── .env.example                # Environment template
```

## Usage

### Store Template (Direct Service Call)
```javascript
// Store biometric template for a customer
biometricService.storeCustomerTemplate(
  "CUST001",                    // customer_id from your API
  templateData,                 // base64 template data
  "right_index",               // finger position
  85                           // quality score
);
```

### Identify Fingerprint (Automatic Local Matching)
```javascript
// Identify using local database (no API routes needed)
const result = await biometricService.identifyFingerprint(liveTemplateData);
// Returns customer_id if match found
```

## Security Features

### 1. Template Encryption
```javascript
// Each template is encrypted with:
// - Customer-specific salt (derived from customer ID)
// - AES-256-GCM encryption
// - Random IV per encryption
// - Authentication tag for integrity
// - PBKDF2 key derivation (100,000 iterations)
```

### 2. Database Encryption
- SQLite database uses additional encryption layer
- Separate encryption key for database file
- WAL mode for better concurrency and crash recovery

### 3. Key Management
- Environment-based key storage
- Automatic key generation with warnings
- Key validation on startup
- Backward compatibility with legacy encryption

## Database Schema

### Single Table: Biometric Templates
```sql
CREATE TABLE biometric_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,          -- Reference to your server customer
    finger_position TEXT NOT NULL,      -- e.g., "right_index", "left_thumb" 
    template_data TEXT NOT NULL,        -- Encrypted biometric template
    quality_score INTEGER DEFAULT 0,    -- Template quality score
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, finger_position)
);
```

**What's NOT stored locally:**
- Customer name, email, phone (stays on your server)
- Account information, permissions
- Personal identifiable information

## Data Management

### Manual Backup
```bash
# Simple database file copy (when service is stopped)
cp data/biometric.db backups/manual_backup_$(date +%Y%m%d_%H%M%S).db
```

## Performance Considerations

1. **Indexes**: Optimized indexes on customer_id, active status, and template hashes
2. **WAL Mode**: Better concurrency for read operations
3. **Memory Usage**: Configurable template caching
4. **Connection Pooling**: Single connection with transaction support

## Migration from Remote Templates

If you have existing templates in remote storage:

1. **Export existing templates** from your remote system
2. **Use biometricService.storeCustomerTemplate()** to import them locally
3. **Verify encryption** works correctly
4. **Test local identification** works as expected

## Security Best Practices

1. **Protect Environment Keys**: Store encryption keys securely
2. **File Permissions**: Restrict access to database files (chmod 600)  
3. **Network Security**: Use HTTPS for customer data API calls
4. **Separation of Concerns**: Keep biometric data local, customer data on server

## What's Stored Where

### Local Database (Biometric Only):
- ✅ `customer_id` - Reference to your server
- ✅ `finger_position` - Which finger template
- ✅ `template_data` - Encrypted biometric template  
- ✅ `quality_score` - Template quality
- ✅ Timestamps for tracking

### Your Server (Customer Details):
- ✅ Customer name, email, phone
- ✅ Account information and permissions
- ✅ Locker access rights
- ✅ Transaction history

## Benefits

- **Fast Local Authentication** - No network dependency for fingerprint matching
- **Privacy Compliant** - No personal data stored locally
- **Simple Architecture** - Single table, minimal complexity
- **Secure Encryption** - AES-256 with customer-specific salts
- **Server Integration** - Seamless with existing customer management

This provides secure local biometric authentication while keeping all customer details on your main server where they belong.