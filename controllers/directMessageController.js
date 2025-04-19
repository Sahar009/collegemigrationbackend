import { 
    createDirectMessage,
    getConversationThread,
    markAsRead,
    getAllUserConversations
} from '../service/directMessageService.js';

export const sendMessage = async (req, res) => {
    try {
      const isAgent = req.user.type === 'agent';
      const receiverType = isAgent ? 'member' : req.body.receiverType;
  
      const result = await createDirectMessage(
        {
          senderId: req.user.id,
          senderType: req.user.type,
          receiverId: req.body.receiverId,
          receiverType,
          message: req.body.message
        },
        req.files?.attachments
      );
      
      return res.status(result.statusCode).json(result);
    } catch (error) {
      console.error('Message send error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

export const getConversation = async (req, res) => {
    try {
        const result = await getConversationThread(
            req.user.id,
            req.user.type,
            req.params.otherId,
            req.params.otherType
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        return res.status(500).json(
            messageHandler("Internal server error", false, 500)
        );
    }
};

export const getAllConversations = async (userId, userType) => {
    try {
        const result = await getAllUserConversations(userId, userType);
        return result;
    } catch (error) {
        console.error('Error in getAllConversations:', error);
        return {
            success: false,
            statusCode: 500,
            message: error.message || 'Internal server error'
        };
    }
}; 