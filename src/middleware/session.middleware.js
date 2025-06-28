// src/middleware/session.middleware.js
module.exports = (logger, allowedOrigins) => (req, res, next) => {
    const isBiometricOperation = req.originalUrl.includes('capture') ||
        req.originalUrl.includes('deviceInfo') ||
        req.originalUrl.includes('initialize');
    if (isBiometricOperation && !req.query.username && !req.headers.cookie?.includes('username=')) {
        logger.warn(`Biometric operation without session: ${req.method} ${req.originalUrl}`);
        const origin = req.headers.origin;
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        return res.status(400).json({
            error: 'Session Required',
            message: 'Biometric operations require a valid session ID',
            suggestion: 'Please create a session first using /api/createSessionID'
        });
    }
    next();
};
