import express from 'express';
import { authenticateAdmin, requireRole } from '../../middleware/adminAuthMiddleware.js';
import * as adminAuthController from '../../controllers/adminAuthController.js';
import * as adminUserController from '../../controllers/adminUserController.js';
import * as adminApplicationController from '../../controllers/adminApplicationController.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const adminRouter = express.Router();

// Auth routes (public)
adminRouter.post('/login', asyncHandler(adminAuthController.login));
adminRouter.post('/forgot-password', asyncHandler(adminAuthController.forgotPassword));
adminRouter.post('/reset-password', asyncHandler(adminAuthController.resetPassword));

// Protected routes
adminRouter.use(authenticateAdmin);

// Admin profile routes
adminRouter.get('/profile', asyncHandler(adminAuthController.getProfile));
adminRouter.put('/profile', asyncHandler(adminAuthController.updateProfile));
adminRouter.put('/change-password', asyncHandler(adminAuthController.changePassword));

// User management routes
adminRouter.get('/users', asyncHandler(adminUserController.getAllUsers));
adminRouter.get('/users/:userType/:userId', asyncHandler(adminUserController.getUserDetails));
adminRouter.put('/users/:userType/:userId/status', asyncHandler(adminUserController.updateUserStatus));
adminRouter.put('/users/:userType/:userId/reset-password', 
    requireRole(['super_admin', 'admin']), 
    asyncHandler(adminUserController.resetUserPassword)
);

// Application management routes
adminRouter.get('/applications', asyncHandler(adminApplicationController.getAllApplications));
adminRouter.get('/applications/:applicationType/:applicationId', 
    asyncHandler(adminApplicationController.getApplicationDetails)
);
adminRouter.put('/applications/:applicationType/:applicationId/status', 
    asyncHandler(adminApplicationController.updateApplicationStatus)
);
adminRouter.put('/documents/:documentType/:documentId/status', 
    asyncHandler(adminApplicationController.updateDocumentStatus)
);
adminRouter.post('/applications/:applicationType/:applicationId/send-to-school', 
    requireRole(['super_admin', 'admin']), 
    asyncHandler(adminApplicationController.sendApplicationToSchool)
);

// Super admin only routes
adminRouter.post('/admins', 
    requireRole(['super_admin']), 
    asyncHandler(adminAuthController.createAdmin)
);
adminRouter.get('/admins', 
    requireRole(['super_admin']), 
    asyncHandler(adminAuthController.getAllAdmins)
);
adminRouter.put('/admins/:adminId/status', 
    requireRole(['super_admin']), 
    asyncHandler(adminAuthController.updateAdminStatus)
);

export default adminRouter; 