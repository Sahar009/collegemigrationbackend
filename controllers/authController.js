import { registerService, loginService, getAllUsersService } from '../service/authServices.js';
import { validationResult } from 'express-validator';

export const registerController = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }

        // If validation passes, proceed with registration
        await registerService(req.body, (response) => {
            return res.status(response.statusCode).json({
                success: response.success,
                message: response.message,
                data: response.data
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

export const loginController = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }

        await loginService(req.body, (response) => {
            return res.status(response.statusCode).json({
                success: response.success,
                message: response.message,
                data: response.data
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}; 
// ... existing imports and code ...

export const getAllUsersController = async (req, res) => {
    try {
        await getAllUsersService((response) => {
            return res.status(response.statusCode).json({
                success: response.success,
                message: response.message,
                data: response.data
            });
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};