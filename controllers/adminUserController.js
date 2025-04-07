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

// Update user details
export const updateUserDetails = async (req, res) => {
    try {
        const { userId, userType } = req.params;
        const updateData = req.body;
        
        const result = await adminUserService.updateUserDetailsService(
            userId, 
            userType, 
            updateData
        );
        
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

// Update user document
export const updateUserDocument = async (req, res) => {
    try {
        const { documentId, documentType } = req.params;
        const updateData = req.body;
        const adminId = req.user.id; // Assuming admin user ID is in the token
        
        const result = await adminUserService.updateUserDocumentService(
            documentId,
            documentType,
            updateData,
            adminId
        );
        
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

// Create user document
export const createUserDocument = async (req, res) => {
    try {
        const { userId, userType } = req.params;
        const documentData = req.body;
        const file = req.file; // Assuming you're using multer/file upload
        
        const result = await adminUserService.createUserDocumentService(
            userId,
            userType,
            documentData,
            {
                path: file.path,
                filename: file.filename
            },
            req.user.id
        );
        
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

// Create member
export const createMember = async (req, res) => {
    try {
        if (!req.files?.idScanFront?.[0] || !req.files?.photo?.[0]) {
            console.log('missing required filleds id and photo')
            return res.status(400).json(
                messageHandler("Missing required files: ID scan and photo", false, 400)
            );
        }

        const memberData = {
            ...req.body,
            idScanFront: req.files.idScanFront[0].path,
            photo: req.files.photo[0].path,
            internationalPassport: req.files.internationalPassport?.[0]?.path,
            idScanBack: req.files.idScanBack?.[0]?.path
        };

        console.log('Processed member data:', {
            ...memberData,
            files: Object.keys(req.files).map(k => ({
                field: k,
                count: req.files[k].length
            }))
        });

        const result = await adminUserService.createMemberService(memberData);
        
        const responseData = result.data ? {
            ...result.data,
            tempPassword: process.env.NODE_ENV === 'production' 
                ? undefined 
                : result.data.tempPassword
        } : null;

        return res.status(result.statusCode).json({
            ...result,
            data: responseData
        });
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler(
                error.message || "Internal server error",
                false,
                500
            )
        );
    }
};

export const uploadUserDocuments = async (req, res) => {
    try {
        const { userId, userType } = req.params;
        const files = req.files;
        
        const result = await adminUserService.uploadUserDocumentsService(
            userId,
            userType,
            files,
            req.user.id // adminId
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Controller error:', error);
        return res.status(500).json(
            messageHandler("Internal server error", false, 500)
        );
    }
};