import * as agentAuthService from '../service/agentAuthService.js';
import { SUCCESS, BAD_REQUEST } from '../constants/statusCode.js';

export const register = async (req, res) => {
    try {
        console.log(req.body);
        const result = await agentAuthService.registerAgent(req.body);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await agentAuthService.loginAgent(email, password);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await agentAuthService.forgotPassword(email);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const result = await agentAuthService.resetPassword(email, otp, newPassword);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const result = await agentAuthService.verifyEmail(token);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = await agentAuthService.changePassword(req.user.id, currentPassword, newPassword);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const result = await agentAuthService.refreshToken(req.user.id);
        return res.status(SUCCESS).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
};

export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(BAD_REQUEST).json({
                success: false,
                message: 'Email is required'
            });
        }

        const result = await agentAuthService.resendOTP(email);
        return res.status(result.success ? SUCCESS : BAD_REQUEST).json(result);
    } catch (error) {
        return res.status(BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
}; 