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
messageRouter.get('/conversations', authenticateUser, getAllConversations);
// Add agent conversation endpoint
messageRouter.get('/messages/agent/conversations', 
    authenticateUser,
    (req, res, next) => {
      if (req.user.type !== 'agent') return res.status(403).json({ message: 'Access denied' });
      next();
    },
    getAllConversations
  );
export default messageRouter;
