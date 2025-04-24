import express from 'express';
import {
    addGroupMembers,
    removeGroupMembers,
    listAllAdmins,
    markMessageRead,
    getUnreadMessagesList
} from '../../controllers/adminGroupController.js';
import { authenticateAdmin, requireRole } from '../../middleware/adminAuthMiddleware.js';

const adminGroupRouter = express.Router();

// Group member management
adminGroupRouter.post('/groups/:groupId/members', 
    authenticateAdmin, 
    requireRole(['admin', 'super_admin']), 
    addGroupMembers
);

adminGroupRouter.delete('/groups/:groupId/members', 
    authenticateAdmin, 
    requireRole(['admin', 'super_admin']), 
    removeGroupMembers
);

// Admin listing
adminGroupRouter.get('/admins', 
    authenticateAdmin, 
    listAllAdmins
);

// Message read status
adminGroupRouter.post('/messages/:messageId/read', 
    authenticateAdmin, 
    markMessageRead
);

adminGroupRouter.get('/messages/unread', 
    authenticateAdmin, 
    getUnreadMessagesList
);

export default adminGroupRouter; 