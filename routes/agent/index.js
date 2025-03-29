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
import studentRouter from './student.js';
import applicationRouter from './application.js';
import paymentRouter from './payment.js';
import * as notificationController from '../../controllers/notificationController.js';
import * as withdrawalController from '../../controllers/withdrawalController.js';

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

agentRouter.post('/change-password', authenticateAgent, asyncHandler(agentAuthController.changePassword));

agentRouter.delete('/delete-account', authenticateAgent, asyncHandler(agentAuthController.deleteAccount));

agentRouter.put('/profile', authenticateAgent, asyncHandler(agentAuthController.updateProfile));
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
    authenticateAgent,
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
    '/profile/validate/:agentId',
    authenticateAgent,
    asyncHandler(agentProfileController.validateProfileCompletionController)
);


agentRouter.use('/students', studentRouter);
agentRouter.use('/applications', applicationRouter);
agentRouter.use('/payments', paymentRouter);

// Add these routes
agentRouter.get('/notifications', asyncHandler(notificationController.getNotifications));
agentRouter.get('/notifications/unread-count', asyncHandler(notificationController.getUnreadCount));
agentRouter.patch('/notifications/:notificationId/read', asyncHandler(notificationController.readNotification));
agentRouter.patch('/notifications/read-all', asyncHandler(notificationController.readAllNotifications));


// Add these routes
agentRouter.get('/wallet/balance', asyncHandler(withdrawalController.getWalletBalance));
agentRouter.get('/withdrawals', asyncHandler(withdrawalController.getUserWithdrawals));
agentRouter.post('/withdrawals', asyncHandler(withdrawalController.createWithdrawal));

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