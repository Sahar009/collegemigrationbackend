import express from 'express';
import { getAllUsersController, googleAuthController, getUserProfileController, loginController, registerController, forgotPassword, verifyResetCode, resetPassword, updatePassword, resendResetCode, deleteAccount } from '../../controllers/authController.js';
import { checkSchema } from 'express-validator';
import { registerValidator } from '../../validations/user/index.js';
import { authenticateUser, memberOnly } from '../../middlewares/auth-middleware.js';
import * as withdrawalController from '../../controllers/withdrawalController.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as notificationController from '../../controllers/notificationController.js';


const authRouter = express.Router();

authRouter.post('/register', checkSchema(registerValidator), registerController);
authRouter.post('/login', loginController);
authRouter.get('/users', getAllUsersController);
authRouter.post('/google', googleAuthController);
authRouter.get('/profile', authenticateUser, getUserProfileController);

// Password reset flow
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/verify-reset-code', verifyResetCode);
authRouter.post('/reset-password', resetPassword);

// Update password (when logged in)
authRouter.put('/update-password', authenticateUser, updatePassword);

// Resend reset code
authRouter.post('/resend-reset-code', resendResetCode);

// Delete account
authRouter.delete('/delete-account', authenticateUser, deleteAccount);

//withdrawal routes
authRouter.get('/wallet/balance',authenticateUser, asyncHandler(withdrawalController.getWalletBalance));
authRouter.get('/withdrawals',authenticateUser, asyncHandler(withdrawalController.getUserWithdrawals));
authRouter.post('/withdrawals',authenticateUser, asyncHandler(withdrawalController.createWithdrawal));

//notification routes
authRouter.get('/notifications',authenticateUser, asyncHandler(notificationController.getNotifications));
authRouter.get('/notifications/unread-count',authenticateUser, asyncHandler(notificationController.getUnreadCount));
authRouter.patch('/notifications/:notificationId/read',authenticateUser, asyncHandler(notificationController.readNotification));
authRouter.patch('/notifications/read-all',authenticateUser, asyncHandler(notificationController.readAllNotifications));
export default authRouter;