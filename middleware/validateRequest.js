import { validationResult } from 'express-validator';
import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST } from '../constants/statusCode.js';

export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(BAD_REQUEST).json(
            messageHandler(
                "Validation error",
                false,
                BAD_REQUEST,
                { errors: errors.array() }
            )
        );
    }
    next();
}; 