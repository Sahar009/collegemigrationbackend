import { body, validationResult } from 'express-validator';

export const validateAgentRegistration = [
    body('companyName')
        .trim()
        .notEmpty()
        .withMessage('Company name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Company name must be between 2 and 100 characters'),
    
    body('contactPerson')
        .trim()
        .notEmpty()
        .withMessage('Contact person name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Contact person name must be between 2 and 100 characters'),
    
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    
    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[+]?[\d\s-]+$/)
        .withMessage('Invalid phone number format'),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('country')
        .trim()
        .notEmpty()
        .withMessage('Country is required'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

export const validateLogin = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

export const validatePasswordReset = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    
    body('otp')
        .trim()
        .notEmpty()
        .withMessage('OTP is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 characters long'),
    
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

export const validateProfileUpdate = [
    body('othernames')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Other names must not exceed 100 characters'),
    
    body('dob')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format'),
    
    body('idType')
        .optional()
        .trim()
        .isIn(['passport', 'national_id', 'drivers_license'])
        .withMessage('Invalid ID type'),
    
    body('idNumber')
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Invalid ID number'),
    
    body('nationality')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Invalid nationality'),
    
    body('homeAddress')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Home address cannot be empty if provided'),
    
    body('homeCity')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Invalid city name'),
    
    body('homeZipCode')
        .optional()
        .trim()
        .matches(/^[A-Z0-9-\s]{3,20}$/i)
        .withMessage('Invalid zip code format'),
    
    body('homeState')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Invalid state name'),
    
    body('homeCountry')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Invalid country name'),
    
    body('gender')
        .optional()
        .trim()
        .isIn(['male', 'female', 'other'])
        .withMessage('Invalid gender value'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: errors.array()
            });
        }
        next();
    }
];

export const validateEmail = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: errors.array()
            });
        }
        next();
    }
]; 