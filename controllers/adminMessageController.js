import {
    sendAdminMessage,
    getAdminConversation,
    getAdminGroupMessages,
    createAdminGroup,
    getAdminConversations,
    getAdminGroups
} from '../service/adminMessageService.js';

export const sendMessage = async (req, res) => {
    try {
        const result = await sendAdminMessage(
            {
                senderId: req.user.adminId,
                receiverId: req.body.receiverId,
                groupId: req.body.groupId,
                message: req.body.message,
                isGroupMessage: req.body.isGroupMessage || false
            },
            req.files?.attachments
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getConversation = async (req, res) => {
    try {
        const { receiverId } = req.params;
        const senderId = req.user.adminId; // Changed from req.user.id

        // Add explicit number validation
        if (isNaN(senderId) || isNaN(receiverId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format - must be numeric'
            });
        }

        // Convert to numbers
        const parsedSender = Number(senderId);
        const parsedReceiver = Number(receiverId);

        console.log('Request params:', { receiverId });
        console.log('Authenticated sender:', senderId);

        if (!senderId || !receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID is required'
            });
        }

        // Don't allow conversation with self
        if (parsedSender === parsedReceiver) {
            return res.status(400).json({
                success: false,
                message: 'Cannot start conversation with yourself'
            });
        }

        const result = await getAdminConversation(
            parsedSender,
            parsedReceiver
        );
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get conversation error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get conversation'
        });
    }
};

export const getGroupMessages = async (req, res) => {
    try {
        const result = await getAdminGroupMessages(req.params.groupId);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get group messages error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createGroup = async (req, res) => {
    try {
        const { groupName, description, members } = req.body;
        const createdBy = req.user.adminId; // Changed from req.user.id

        if (!req.user || !req.user.adminId) {
            console.error('No user found in request:', req.user);
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const groupData = {
            groupName,
            description,
            members: members.map(id => Number(id)), // Convert all member IDs to numbers
            createdBy
        };

        console.log('Creating group with data:', groupData);

        const result = await createAdminGroup(groupData);
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Create group error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create group'
        });
    }
};

export const getAllConversations = async (req, res) => {
    try {
        const result = await getAdminConversations(req.user.adminId);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get all conversations error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getAllGroups = async (req, res) => {
    try {
        const result = await getAdminGroups(req.user.adminId);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get all groups error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 