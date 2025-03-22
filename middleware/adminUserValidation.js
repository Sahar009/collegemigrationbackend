import { body, param, query } from 'express-validator';
import { validateRequest } from './validateRequest.js';

// Validate get all users query parameters
export const validateGetUsers = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('userType').optional().isIn(['all', 'member', 'agent']).withMessage('Invalid user type'),
    query('status').optional().isString().withMessage('Status must be a string'),
    query('sortBy').optional().isString().withMessage('Sort by must be a string'),
    query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC'),
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
    body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    validateRequest
];

// Validate reset user password
export const validateResetUserPassword = [
    param('userId').isInt().withMessage('User ID must be an integer'),
    param('userType').isIn(['member', 'agent']).withMessage('User type must be member or agent'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    validateRequest
]; 