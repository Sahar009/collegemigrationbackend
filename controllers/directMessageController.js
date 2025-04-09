import { 
    createDirectMessage,
    getConversationThread,
    markAsRead,
    getAllUserConversations
} from '../service/directMessageService.js';

export const sendMessage = async (req, res) => {
    try {
        const result = await createDirectMessage(
            {
                senderId: req.user.id,
                senderType: req.user.type,
                receiverId: req.body.receiverId,
                receiverType: req.body.receiverType,
                message: req.body.message
            },
            req.files?.attachments
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        return res.status(500).json(
            messageHandler("Internal server error", false, 500)
        );
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

export const getAllConversations = async (req, res) => {
    try {
        const result = await getAllUserConversations(
            req.user.id,
            req.user.type
        );
        return res.status(result.statusCode).json(result);
    } catch (error) {
        return res.status(500).json(
            messageHandler("Internal server error", false, 500)
        );
    }
}; 