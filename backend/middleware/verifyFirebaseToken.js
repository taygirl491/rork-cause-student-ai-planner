const { admin } = require('../firebase');

/**
 * Middleware that verifies a Firebase ID token from the Authorization header.
 * On success, attaches `req.user` (the decoded token) with uid, email, etc.
 * Usage: router.get('/route', verifyFirebaseToken, handler)
 */
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7); // strip "Bearer "
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('[Auth] Token verification failed:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = verifyFirebaseToken;
