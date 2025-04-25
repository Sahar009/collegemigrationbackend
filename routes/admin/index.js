import express from 'express';
import { authenticateAdmin, requireRole } from '../../middleware/adminAuthMiddleware.js';
import * as adminAuthController from '../../controllers/adminAuthController.js';
import * as adminUserController from '../../controllers/adminUserController.js';
import * as adminApplicationController from '../../controllers/adminApplicationController.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { 
    validateLogin, 
    validateForgotPassword, 
    validateResetPassword,
    validateChangePassword,
    validateUpdateProfile,
    validateCreateAdmin,
    validateUpdateAdminStatus
} from '../../middleware/adminAuthValidation.js';
import {
    validateGetUsers,
    validateUserDetails,
    validateUpdateUserStatus,
    validateResetUserPassword
} from '../../middleware/adminUserValidation.js';
import {
    validateGetApplications,
    validateApplicationDetails,
    validateUpdateApplicationStatus,
    validateUpdateDocumentStatus,
    validateSendToSchool
} from '../../middleware/adminApplicationValidation.js';
import * as adminDashboardController from '../../controllers/adminDashboardController.js';
import * as adminProgramController from '../../controllers/adminProgramController.js';
import * as adminSchoolController from '../../controllers/adminSchoolController.js';
import * as adminTransactionController from '../../controllers/adminTransactionController.js';
import * as adminNotificationController from '../../controllers/adminNotificationController.js';
import * as adminWithdrawalController from '../../controllers/adminWithdrawalController.js';
import { handleUploadError, uploadFields } from '../../middlewares/uploadMiddleware.js';
import { toggleProgramStatusController } from '../../controllers/programController.js';
import * as referralController from '../../controllers/referralController.js';
const adminRouter = express.Router();

// Auth routes (public)
adminRouter.post('/login', validateLogin, asyncHandler(adminAuthController.login));
adminRouter.post('/forgot-password', validateForgotPassword, asyncHandler(adminAuthController.forgotPassword));
adminRouter.post('/reset-password', validateResetPassword, asyncHandler(adminAuthController.resetPassword));

// Protected routes
adminRouter.use(authenticateAdmin);

// Admin profile routes
adminRouter.get('/profile', asyncHandler(adminAuthController.getProfile));
adminRouter.put('/profile', validateUpdateProfile, asyncHandler(adminAuthController.updateProfile));
adminRouter.put('/change-password', validateChangePassword, asyncHandler(adminAuthController.changePassword));

// User management routes
adminRouter.get('/users', validateGetUsers, asyncHandler(adminUserController.getAllUsers));
adminRouter.get('/users/:userType/:userId', validateUserDetails, asyncHandler(adminUserController.getUserDetails));
adminRouter.put('/users/:userType/:userId/status', validateUpdateUserStatus, asyncHandler(adminUserController.updateUserStatus));
adminRouter.put('/users/:userType/:userId/reset-password', 
    requireRole(['super_admin', 'admin']), 
    validateResetUserPassword,
    asyncHandler(adminUserController.resetUserPassword)
);

// Application management routes
adminRouter.get('/applications', validateGetApplications, asyncHandler(adminApplicationController.getAllApplications));
adminRouter.get('/applications/:applicationType/:applicationId', 
    validateApplicationDetails,
    asyncHandler(adminApplicationController.getApplicationDetails)
);
adminRouter.put('/applications/:applicationType/:applicationId/status', 
    validateUpdateApplicationStatus,
    asyncHandler(adminApplicationController.updateApplicationStatus)
);
adminRouter.put('/documents/:documentType/:documentId/status', 
    validateUpdateDocumentStatus,
    asyncHandler(adminApplicationController.updateDocumentStatus)
);
adminRouter.post('/applications/:applicationType/:applicationId/send-to-school', 
    requireRole(['super_admin', 'admin']), 
    validateSendToSchool,
    asyncHandler(adminApplicationController.sendApplicationToSchool)
);

// Super admin only routes
adminRouter.post('/admins', 
    // requireRole(['super_admin']), 
    validateCreateAdmin,
    asyncHandler(adminAuthController.createAdmin)
);
adminRouter.get('/admins', 
    requireRole(['super_admin']), 
    asyncHandler(adminAuthController.getAllAdmins)
);
adminRouter.put('/admins/:adminId/status', 
    requireRole(['super_admin']), 
    validateUpdateAdminStatus,
    asyncHandler(adminAuthController.updateAdminStatus)
);

//dashboard routes
adminRouter.get('/dashboard', asyncHandler(adminDashboardController.getDashboardMetrics));

//program routes
adminRouter.get('/programs', asyncHandler(adminProgramController.getAllPrograms));
adminRouter.get('/programs/:programId', asyncHandler(adminProgramController.getProgramById));
adminRouter.post('/programs', asyncHandler(adminProgramController.createProgram));
adminRouter.put('/programs/:programId', asyncHandler(adminProgramController.updateProgram));
adminRouter.put('/programs/:programId/status', asyncHandler(adminProgramController.toggleProgramStatus));
adminRouter.post('/programs/import', asyncHandler(adminProgramController.importProgramsFromCSV));
adminRouter.get('/programs/export', asyncHandler(adminProgramController.exportPrograms));
adminRouter.patch('/programs/:id/status', asyncHandler(toggleProgramStatusController));

//school routes
adminRouter.get('/schools', asyncHandler(adminSchoolController.getAllSchools));
adminRouter.get('/schools/:schoolId', asyncHandler(adminSchoolController.getSchoolById));
adminRouter.post('/schools', asyncHandler(adminSchoolController.createSchool));
adminRouter.put('/schools/:schoolId', asyncHandler(adminSchoolController.updateSchool));
adminRouter.put('/schools/:schoolId/status', asyncHandler(adminSchoolController.toggleSchoolStatus));
adminRouter.post('/schools/import', asyncHandler(adminSchoolController.importSchoolsFromCSV));

// Transaction management routes
adminRouter.get('/transactions', asyncHandler(adminTransactionController.getAllTransactions));
adminRouter.get('/transactions/:transactionType/:transactionId', asyncHandler(adminTransactionController.getTransactionById));
adminRouter.get('/transactions/export', asyncHandler(adminTransactionController.exportTransactions));

//notification routes

adminRouter.post('/notifications/send', asyncHandler(adminNotificationController.sendNotifications));
adminRouter.get('/notifications', asyncHandler(adminNotificationController.getSentNotifications));
adminRouter.delete('/notifications/:notificationId', asyncHandler(adminNotificationController.deleteNotification));

// Withdrawal routes
adminRouter.get('/withdrawals', asyncHandler(adminWithdrawalController.getAllWithdrawals));
adminRouter.get('/withdrawals/stats', asyncHandler(adminWithdrawalController.getWithdrawalStats));
adminRouter.get('/withdrawals/:withdrawalId', asyncHandler(adminWithdrawalController.getWithdrawalById));
adminRouter.put('/withdrawals/:withdrawalId/process', asyncHandler(adminWithdrawalController.processWithdrawal));
//user routes
adminRouter.put('/users/:userType/:userId', asyncHandler(adminUserController.updateUserDetails));
adminRouter.put('/documents/:documentType/:documentId', asyncHandler(adminUserController.updateUserDocument));
adminRouter.post('/create-user',uploadFields, // Handle multiple file uploads
    handleUploadError, asyncHandler(adminUserController.createMember));
adminRouter.post('/upload-user-documents/:userId/:userType', uploadFields, handleUploadError, asyncHandler(adminUserController.uploadUserDocuments));

adminRouter.get(
    '/:id/export-to-excel',
    authenticateAdmin,
    adminApplicationController.exportApplicationToExcel
);
adminRouter.patch(
    '/:id/intake',
    authenticateAdmin,
    adminApplicationController.updateApplicationIntake
);

// Notification endpoint
adminRouter.post(
    '/:id/notify',
    authenticateAdmin,
    adminApplicationController.notifyApplicant
);

// Referral routes
adminRouter.get('/referrals', asyncHandler(referralController.getAdminReferrals));

export default adminRouter; 