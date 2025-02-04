import { registerService, loginService, getAllUsersService, googleAuthService, getUserProfileService } from '../service/authServices.js';
import { validationResult } from 'express-validator';

export const registerController = async (req, res) => {
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
};

export const loginController = async (req, res) => {
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
};

export const getAllUsersController = async (req, res) => {
    await getAllUsersService((response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
};

export const googleAuthController = async (req, res) => {
    const { idToken } = req.body;
    
    if (!idToken) {
        return res.status(400).json({
            success: false,
            message: 'ID token is required'
        });
    }

    await googleAuthService(idToken, (response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
};

export const getUserProfileController = async (req, res) => {
    const agentId = req.params.id;
    
    if (!agentId) {
        return res.status(400).json({
            success: false,
            message: 'Agent ID is required'
        });
    }

    await getUserProfileService(agentId, (response) => {
        return res.status(response.statusCode).json({
            success: response.success,
            message: response.message,
            data: response.data
        });
    });
};