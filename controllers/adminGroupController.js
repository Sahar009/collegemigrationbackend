import {
    addMembersToGroup,
    removeMembersFromGroup,
    getAllAdmins,
    markMessageAsRead,
    getUnreadMessages
} from '../service/adminGroupService.js';

export const addGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { memberIds } = req.body;

        const updatedGroup = await addMembersToGroup(groupId, memberIds);
        res.json({
            success: true,
            data: updatedGroup
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const removeGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { memberIds } = req.body;

        const updatedGroup = await removeMembersFromGroup(groupId, memberIds);
        res.json({
            success: true,
            data: updatedGroup
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const listAllAdmins = async (req, res) => {
    try {
        const admins = await getAllAdmins();
        res.json({
            success: true,
            data: admins
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const markMessageRead = async (req, res) => {
    try {
        const { messageId } = req.params;
        const adminId = req.user.adminId; // Using adminId instead of _id

        const message = await markMessageAsRead(messageId, adminId);
        res.json({
            success: true,
            data: message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const getUnreadMessagesList = async (req, res) => {
    try {
        // Get admin ID from the authenticated user
        const adminId = req.user?.id;
        
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Convert to number and validate
        const numericAdminId = Number(adminId);
        if (isNaN(numericAdminId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid admin ID format'
            });
        }

        const messages = await getUnreadMessages(numericAdminId);
        
        return res.json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Error in getUnreadMessagesList:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 