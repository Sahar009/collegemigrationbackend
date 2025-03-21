import * as adminUserService from '../service/adminUserService.js';
import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST } from '../constants/statusCode.js';

// Get all users
export const getAllUsers = async (req, res) => {
    try {
        const result = await adminUserService.getAllUsersService(req.query);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Get user details
export const getUserDetails = async (req, res) => {
    try {
        const { userId, userType } = req.params;
        
        if (!userId || !userType) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "User ID and type are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const result = await adminUserService.getUserDetailsService(userId, userType);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Update user status
export const updateUserStatus = async (req, res) => {
    try {
        const { userId, userType } = req.params;
        const { status } = req.body;
        
        if (!userId || !userType) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "User ID and type are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "Valid status (active/inactive) is required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const result = await adminUserService.updateUserStatusService(userId, userType, status);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
};

// Reset user password
export const resetUserPassword = async (req, res) => {
    try {
        const { userId, userType } = req.params;
        const { newPassword } = req.body;
        
        if (!userId || !userType) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "User ID and type are required",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        if (!newPassword || newPassword.length < 8) {
            return res.status(BAD_REQUEST).json(
                messageHandler(
                    "New password must be at least 8 characters",
                    false,
                    BAD_REQUEST
                )
            );
        }
        
        const result = await adminUserService.resetUserPasswordService(userId, userType, newPassword);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                "Internal server error",
                false,
                500
            )
        );
    }
}; 