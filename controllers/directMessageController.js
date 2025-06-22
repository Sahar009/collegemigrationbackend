import { 
    createDirectMessage,
    getConversationThread,
    getDirectMessages as fetchDirectMessages,
    markAsRead,
    getAllUserConversations
} from '../service/directMessageService.js';
import { messageHandler } from '../utils/index.js';

export const sendMessage = async (req, res) => {
    console.log('Message send request received:', req.body);
    try {
        const isAgent = req.user.type === 'agent';
        const receiverType = isAgent ? 'member' : req.body.receiverType;
        const senderType = req.user.type || 'admin'; // Ensure senderType is set

        const result = await createDirectMessage(
            {
                senderId: req.user.id,
                senderType: senderType, // Pass the senderType correctly
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
            req.query.userId,
            req.query.userType,
            req.params.otherId,    
            req.params.otherType 
        );
        
        // Add default status code if undefined
        return res.status(result.statusCode || 500).json(result);
    } catch (error) {
        console.error('Get conversation error:', error);
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

export const getDirectMessages = async (req, res) => {
    try {
        const { id: userId, type: userType } = req.user; // Updated to match your auth structure
        const { partnerId, partnerType } = req.params;

        if (!partnerId || !partnerType) {
            return res.status(400).json({
                success: false,
                message: 'Partner ID and type are required'
            });
        }

        const result = await fetchDirectMessages( // Use the renamed import
            userId,
            userType,
            partnerId,
            partnerType
        );

        return res.status(result.statusCode || 200).json(result);
    } catch (error) {
        console.error('Get direct messages controller error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};