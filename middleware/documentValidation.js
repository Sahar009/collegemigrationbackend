import { body, param } from 'express-validator';
import { BAD_REQUEST } from '../constants/statusCode.js';

export const validateUpdateDocumentPath = [
    param('documentId')
        .isInt().withMessage('Document ID must be an integer')
        .toInt(),
    body('documentType')
        .isIn(['direct', 'agent']).withMessage('Document type must be either direct or agent'),
    body('newPath')
        .isString().withMessage('New path must be a string')
        .notEmpty().withMessage('New path is required')
];
