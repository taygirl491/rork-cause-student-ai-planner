const { body, validationResult } = require('express-validator');

/**
 * Middleware: run express-validator checks and return 400 on first failure.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg,
        });
    }
    next();
};

/** Validators for POST /api/study-groups (create group) */
const validateCreateGroup = [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Group name must be 1–100 characters'),
    body('className').trim().isLength({ min: 1, max: 100 }).withMessage('Class name must be 1–100 characters'),
    body('school').trim().isLength({ min: 1, max: 150 }).withMessage('School name must be 1–150 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
    body('creatorId').trim().isLength({ min: 20, max: 128 }).withMessage('Invalid creatorId'),
    body('creatorEmail').trim().isEmail().withMessage('Invalid creator email'),
    validate,
];

/** Validators for POST /api/study-groups/join */
const validateJoinGroup = [
    body('code').trim().isLength({ min: 6, max: 10 }).isAlphanumeric().withMessage('Invalid group code'),
    body('email').trim().isEmail().withMessage('Invalid email address'),
    body('userId').trim().isLength({ min: 20, max: 128 }).withMessage('Invalid userId'),
    validate,
];

/** Validators for POST /api/study-groups/:groupId/messages */
const validateMessage = [
    body('senderEmail').trim().isEmail().withMessage('Invalid sender email'),
    body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1–2000 characters'),
    validate,
];

module.exports = { validateCreateGroup, validateJoinGroup, validateMessage };
