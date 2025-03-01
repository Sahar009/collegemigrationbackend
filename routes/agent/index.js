import express from 'express';
import * as agentAuthController from '../../controllers/agentAuthController.js';
import * as agentProfileController from '../../controllers/agentProfileController.js';
import { 
    validateAgentRegistration, 
    validateLogin, 
    validatePasswordReset,
    validateProfileUpdate,
    validateEmail
} from '../../middleware/validationMiddleware.js';
import { authenticateAgent } from '../../middleware/authMiddleware.js';
import { handleUploadError, uploadFields } from '../../middlewares/uploadMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const agentRouter = express.Router();

// Public routes with error handling
agentRouter.post(
    '/register', 
    validateAgentRegistration,
    asyncHandler(agentAuthController.register)
);

agentRouter.post(
    '/login', 
    validateLogin,
    asyncHandler(agentAuthController.login)
);

agentRouter.post(
    '/forgot-password',
    asyncHandler(agentAuthController.forgotPassword)
);

agentRouter.post(
    '/reset-password',
    validatePasswordReset,
    asyncHandler(agentAuthController.resetPassword)
);

agentRouter.get(
    '/verify-email/:token',
    asyncHandler(agentAuthController.verifyEmail)
);

agentRouter.post('/resend-otp', validateEmail, asyncHandler(agentAuthController.resendOTP));

// Protected routes
agentRouter.use(authenticateAgent);

// Profile routes with validation and error handling
agentRouter.post(
    '/profile/complete',
    uploadFields,
    handleUploadError,
    validateProfileUpdate,
    asyncHandler(agentProfileController.completeProfile)
);

agentRouter.get(
    '/profile',
    asyncHandler(agentProfileController.getProfile)
);

agentRouter.put(
    '/profile',
    uploadFields,
    handleUploadError,
    validateProfileUpdate,
    asyncHandler(agentProfileController.updateProfile)
);

agentRouter.get(
    '/profile/validate',
    asyncHandler(agentProfileController.validateProfileCompletionController)
);

// Error handling middleware
agentRouter.use((err, req, res, next) => {
    console.error('Route Error:', err);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.errors
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized Access'
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Internal Server Error'
    });
});

export default agentRouter; 