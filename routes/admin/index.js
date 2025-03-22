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

const adminRouter = express.Router();

// Auth routes (public)
adminRouter.post('/login', validateLogin, asyncHandler(adminAuthController.login));
adminRouter.post('/forgot-password', validateForgotPassword, asyncHandler(adminAuthController.forgotPassword));
adminRouter.post('/reset-password', validateResetPassword, asyncHandler(adminAuthController.resetPassword));

// Protected routes
// adminRouter.use(authenticateAdmin);

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

export default adminRouter; 