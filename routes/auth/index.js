import express from 'express';
import { getAllUsersController, googleAuthController, getUserProfileController, loginController, registerController, forgotPassword, verifyResetCode, resetPassword, updatePassword, resendResetCode, deleteAccount } from '../../controllers/authController.js';
import { checkSchema } from 'express-validator';
import { registerValidator } from '../../validations/user/index.js';
import { authenticateUser } from '../../middlewares/auth-middleware.js';


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

export default authRouter;