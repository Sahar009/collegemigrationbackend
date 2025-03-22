import { body } from 'express-validator';
import { validateRequest } from './validateRequest.js';

// Validate login
export const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    validateRequest
];

// Validate forgot password
export const validateForgotPassword = [
    body('email').isEmail().withMessage('Valid email is required'),
    validateRequest
];

// Validate reset password
export const validateResetPassword = [
    body('token').isString().withMessage('Token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    validateRequest
];

// Validate change password
export const validateChangePassword = [
    body('currentPassword').isLength({ min: 8 }).withMessage('Current password must be at least 8 characters'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    validateRequest
];

// Validate update profile
export const validateUpdateProfile = [
    body('fullName').optional().isString().withMessage('Full name must be a string'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('username').optional().isString().withMessage('Username must be a string'),
    validateRequest
];

// Validate create admin
export const validateCreateAdmin = [
    body('username').isString().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').isString().withMessage('Full name is required'),
    body('role').isIn(['super_admin', 'admin', 'moderator']).withMessage('Role must be super_admin, admin, or moderator'),
    validateRequest
];

// Validate update admin status
export const validateUpdateAdminStatus = [
    body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
    validateRequest
]; 