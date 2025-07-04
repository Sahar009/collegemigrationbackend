import { body, param, query } from 'express-validator';
import { validateRequest } from './validateRequest.js';

// Validate get all users query parameters
export const validateGetUsers = [
    query('all')
        .optional()
        .isString()
        .isIn(['true', 'false'])
        .withMessage('All must be either "true" or "false"')
        .toBoolean(),
    query('page')
        .optional()
        .custom((value, { req }) => {
            if (req.query.all === true) return true;
            if (!value) throw new Error('Page is required when not fetching all records');
            return !isNaN(value) && parseInt(value) > 0;
        })
        .withMessage('Page must be a positive integer')
        .toInt(),
    query('limit')
        .optional()
        .custom((value, { req }) => {
            if (req.query.all === true) return true;
            if (!value) throw new Error('Limit is required when not fetching all records');
            const num = parseInt(value);
            return !isNaN(num) && num > 0 && num <= 1000;
        })
        .withMessage('Limit must be between 1 and 1000')
        .toInt(),
    query('userType')
        .optional()
        .isIn(['all', 'member', 'agent'])
        .withMessage('Invalid user type'),
    query('status')
        .optional()
        .isString()
        .withMessage('Status must be a string'),
    query('sortBy')
        .optional()
        .isString()
        .withMessage('Sort by must be a string'),
    query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('Sort order must be ASC or DESC'),
    validateRequest
];

// Validate get user details parameters
export const validateUserDetails = [
    param('userId').isInt().withMessage('User ID must be an integer'),
    param('userType').isIn(['member', 'agent']).withMessage('User type must be member or agent'),
    validateRequest
];

// Validate update user status
export const validateUpdateUserStatus = [
    param('userId').isInt().withMessage('User ID must be an integer'),
    param('userType').isIn(['member', 'agent']).withMessage('User type must be member or agent'),
    body('status')
        .custom((value, { req }) => {
            const userType = req.params.userType;
            if (userType === 'member') {
                return ['ACTIVE', 'SUSPENDED', 'PENDING'].includes(value.toUpperCase());
            } else {
                return ['active', 'inactive', 'pending'].includes(value.toLowerCase());
            }
        })
        .withMessage('Invalid status for the specified user type'),
    validateRequest
];

// Validate reset user password
export const validateResetUserPassword = [
    param('userId').isInt().withMessage('User ID must be an integer'),
    param('userType').isIn(['member', 'agent']).withMessage('User type must be member or agent'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    validateRequest
]; 