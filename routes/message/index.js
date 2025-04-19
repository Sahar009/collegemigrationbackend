import express from 'express';
import { sendMessage, getConversation, getAllConversations } from '../../controllers/directMessageController.js'
import { authenticateUser } from '../../middlewares/auth-middleware.js';
import { validateMessage } from '../../middlewares/validateMessage.js';
import { messageAttachments, handleUploadError } from '../../middlewares/uploadMiddleware.js';

const messageRouter = express.Router();

messageRouter.post('/messages', 
    authenticateUser,
    // validateMessage,
    messageAttachments,
    handleUploadError,
    sendMessage
);

messageRouter.get('/messages/:otherId/:otherType', authenticateUser, getConversation);
messageRouter.get('/conversations', 
  authenticateUser,
  async (req, res) => {
    try {
      const result = await getAllConversations(req.user.id, 'member');
      if (result.statusCode) {
        return res.status(result.statusCode).json(result);
      }
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Server error' 
      });
    }
  }
);

messageRouter.get('/agent/conversations', 
  authenticateUser,
  (req, res, next) => {
    if (req.user.type !== 'agent') return res.status(403).json({ message: 'Access denied' });
    next();
  },
  async (req, res) => {
    try {
      const result = await getAllConversations(req.user.id, 'agent');
      res.status(result.statusCode).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

messageRouter.get('/member/conversations', 
  authenticateUser,
  (req, res, next) => {
    if (req.user.type !== 'member') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }
    next();
  },
  async (req, res) => {
    try {
      const result = await getAllConversations(req.user.id, 'member');
      
      if (result.statusCode) {
        return res.status(result.statusCode).json(result);
      }
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in member conversations:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Server error'
      });
    }
  }
);

messageRouter.get('/agent/messages/:partnerId', 
  authenticateUser,
  async (req, res) => {
    try {
      const messages = await getConversationThread(
        req.user.id, 
        'agent',
        req.params.partnerId,
        req.query.partnerType
      );
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

messageRouter.get('/member/messages/:partnerId', 
  authenticateUser,
  async (req, res) => {
    try {
      const messages = await getAllConversations(
        req.user.id, 
        'member',
        req.params.partnerId,
        req.query.partnerType
      );
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);
export default messageRouter;
