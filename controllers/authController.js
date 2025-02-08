import { registerService, loginService, getAllUsersService, googleAuthService, getUserProfileService, deleteAccountService } from '../service/authServices.js';
import { validationResult } from 'express-validator';
import { 
    forgotPasswordService, 
    verifyResetCodeService, 
    resetPasswordService,
    updatePasswordService,
    resendResetCodeService
} from '../service/authServices.js';

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
    const agentId = req.user.id;
    
    if (!agentId) {
        return res.status(400).json({
            success: false,
            message: 'User ID is required'
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

export const forgotPassword = (req, res) => {
    const { email } = req.body;
    console.log(email);
    forgotPasswordService(email, (response) => {
        res.status(response.statusCode).json(response);
    });
};

export const verifyResetCode = (req, res) => {
    const { email, resetCode } = req.body;
    
    verifyResetCodeService(email, resetCode, (response) => {
        res.status(response.statusCode).json(response);
    });
};

export const resetPassword = (req, res) => {
    const { email, resetCode, newPassword } = req.body;
    
    resetPasswordService(email, resetCode, newPassword, (response) => {
        res.status(response.statusCode).json(response);
    });
};

export const updatePassword = (req, res) => {
    const memberId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    updatePasswordService(memberId, currentPassword, newPassword, (response) => {
        res.status(response.statusCode).json(response);
    });
};

export const resendResetCode = (req, res) => {
    const { email } = req.body;
    
    resendResetCodeService(email, (response) => {
        res.status(response.statusCode).json(response);
    });
};

export const deleteAccount = (req, res) => {
    const memberId = req.user.id;
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({
            success: false,
            message: 'Password is required'
        });
    }

    deleteAccountService(memberId, password, (response) => {
        res.status(response.statusCode).json(response);
    });
};