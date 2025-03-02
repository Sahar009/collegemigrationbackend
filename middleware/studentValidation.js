import { body, param, query } from 'express-validator';
import { validateRequest } from '../utils/validator.js';

// Validation for creating a new student
export const validateCreateStudent = [
    // Personal Information
    body('firstname')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s-']+$/).withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),

    body('lastname')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s-']+$/).withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),

    body('othernames')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Other names must not exceed 100 characters')
        .matches(/^[a-zA-Z\s-']+$/).withMessage('Other names can only contain letters, spaces, hyphens and apostrophes'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('phone')
        .optional()
        .trim()
        .matches(/^\+?[\d\s-]{10,20}$/).withMessage('Invalid phone number format'),

    body('gender')
        .optional()
        .trim()
        .isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender value'),

    body('dob')
        .optional()
        .isISO8601().withMessage('Invalid date format')
        .custom(value => {
            const date = new Date(value);
            const now = new Date();
            const minDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
            if (date > now || date < minDate) {
                throw new Error('Invalid date of birth');
            }
            return true;
        }),

    // Address Information
    body('homeAddress')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('Address is too long'),

    body('homeCity')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('City name is too long'),

    body('homeZipCode')
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage('Zip code is too long'),

    body('homeState')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('State name is too long'),

    body('homeCountry')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Country name is too long'),

    body('nationality')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Nationality is too long'),

    // ID Information
    body('idType')
        .optional()
        .trim()
        .isIn(['Passport', 'National ID', 'Drivers License']).withMessage('Invalid ID type'),

    body('idNumber')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('ID number is too long'),

    validateRequest
];

// Validation for updating a student
export const validateUpdateStudent = [
    param('memberId')
        .isInt().withMessage('Invalid member ID'),

    // All fields are optional for update
    body('firstname')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s-']+$/).withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),

    body('lastname')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s-']+$/).withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('phone')
        .optional()
        .trim()
        .matches(/^\+?[\d\s-]{10,20}$/).withMessage('Invalid phone number format'),

    // ... other optional fields with same validation as create ...

    validateRequest
];

// Validation for getting students (pagination)
export const validateGetStudents = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),

    validateRequest
];

// Validation for member ID in params
export const validateMemberId = [
    param('memberId')
        .isInt().withMessage('Invalid member ID')
        .toInt(),
        
    validateRequest
]; 