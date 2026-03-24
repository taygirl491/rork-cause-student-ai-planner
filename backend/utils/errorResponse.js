/**
 * Safe error response helper — strips internal error details in production.
 * Use instead of res.status(500).json({ error: '...', details: error.message })
 */
function safeError(res, status, message, error) {
    const body = { success: false, error: message };
    if (process.env.NODE_ENV === 'development' && error) {
        body.details = error.message;
    }
    return res.status(status).json(body);
}

module.exports = { safeError };
