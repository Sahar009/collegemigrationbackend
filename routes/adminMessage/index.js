import express from 'express';
import { authenticateAdmin } from '../../middleware/adminAuthMiddleware.js';
import {
    sendMessage,
    getConversation,
    getGroupMessages,
    createGroup,
    getAllConversations,
    getAllGroups
} from '../../controllers/adminMessageController.js';
import { messageAttachments, handleUploadError } from '../../middlewares/uploadMiddleware.js';

const adminMessageRouter = express.Router();

// Send a message (direct or group)
adminMessageRouter.post('/send', authenticateAdmin, messageAttachments, handleUploadError, sendMessage);

// Get conversation between authenticated admin and another admin
adminMessageRouter.get('/conversation/:receiverId', authenticateAdmin, getConversation);

// Get messages in a group
adminMessageRouter.get('/group/:groupId', authenticateAdmin, getGroupMessages);

// Create a new group
adminMessageRouter.post('/group', authenticateAdmin, createGroup);

// Get all conversations
adminMessageRouter.get('/conversations', authenticateAdmin, getAllConversations);

// Get all groups
adminMessageRouter.get('/groups', authenticateAdmin, getAllGroups);

export default adminMessageRouter; 