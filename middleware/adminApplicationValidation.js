import { body, param, query } from 'express-validator';
import { validateRequest } from './validateRequest.js';

// Validate get all applications query parameters
export const validateGetApplications = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('applicationType').optional().isIn(['all', 'direct', 'agent']).withMessage('Invalid application type'),
    query('status').optional().isString().withMessage('Status must be a string'),
    query('paymentStatus').optional().isString().withMessage('Payment status must be a string'),
    query('sortBy').optional().isString().withMessage('Sort by must be a string'),
    query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC'),
    query('startDate').optional().isDate().withMessage('Start date must be a valid date'),
    query('endDate').optional().isDate().withMessage('End date must be a valid date'),
    validateRequest
];

// Validate get application details parameters
export const validateApplicationDetails = [
    param('applicationId').isInt().withMessage('Application ID must be an integer'),
    param('applicationType').isIn(['direct', 'agent']).withMessage('Application type must be direct or agent'),
    validateRequest
];

// Validate update application status
export const validateUpdateApplicationStatus = [
    param('applicationId').isInt().withMessage('Application ID must be an integer'),
    param('applicationType').isIn(['direct', 'agent']).withMessage('Application type must be direct or agent'),
    body('applicationStatus').optional().isString().withMessage('Application status must be a string'),
    body('paymentStatus').optional().isString().withMessage('Payment status must be a string'),
    body('applicationStage').optional().isString().withMessage('Application stage must be a string'),
    validateRequest
];

// Validate update document status
export const validateUpdateDocumentStatus = [
    param('documentId').isInt().withMessage('Document ID must be an integer'),
    param('documentType').isIn(['direct', 'agent']).withMessage('Document type must be direct or agent'),
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Status must be pending, approved, or rejected'),
    validateRequest
];

// Validate send application to school
export const validateSendToSchool = [
    param('applicationId').isInt().withMessage('Application ID must be an integer'),
    param('applicationType').isIn(['direct', 'agent']).withMessage('Application type must be direct or agent'),
    validateRequest
]; 