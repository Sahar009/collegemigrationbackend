import {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount
} from '../service/notificationService.js';

export const getNotifications = async (req, res) => {
    try {
        // Debug the user object to see its structure
        console.log('User object in notification controller:', req.user);
        
        // Extract userId based on user type
        let userId;
        let userType;
        
        if (req.user.role === 'admin') {
            userId = req.user.id || req.user.adminId;
            userType = 'admin';
        } else if (req.user.agentId) {
            userId = req.user.agentId;
            userType = 'agent';
        } else if (req.user.memberId) {
            userId = req.user.memberId;
            userType = 'member';
        } else {
            // If we can't determine the user ID, return an error
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID',
                statusCode: 400
            });
        }
        
        console.log(`Fetching notifications for ${userType} with ID ${userId}`);
        
        const result = await getUserNotifications(userId, userType, req.query);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get notifications error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve notifications',
            statusCode: 500
        });
    }
};

export const readNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        
        // Extract userId based on user type
        let userId;
        let userType;
        
        if (req.user.role === 'admin') {
            userId = req.user.id || req.user.adminId;
            userType = 'admin';
        } else if (req.user.agentId) {
            userId = req.user.agentId;
            userType = 'agent';
        } else if (req.user.memberId) {
            userId = req.user.memberId;
            userType = 'member';
        } else {
            // If we can't determine the user ID, return an error
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID',
                statusCode: 400
            });
        }
        
        const result = await markNotificationAsRead(notificationId, userId, userType);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Read notification error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark notification as read',
            statusCode: 500
        });
    }
};

export const readAllNotifications = async (req, res) => {
    try {
        // Extract userId based on user type
        let userId;
        let userType;
        
        if (req.user.role === 'admin') {
            userId = req.user.id || req.user.adminId;
            userType = 'admin';
        } else if (req.user.agentId) {
            userId = req.user.agentId;
            userType = 'agent';
        } else if (req.user.memberId) {
            userId = req.user.memberId;
            userType = 'member';
        } else {
            // If we can't determine the user ID, return an error
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID',
                statusCode: 400
            });
        }
        
        const result = await markAllNotificationsAsRead(userId, userType);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Read all notifications error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark all notifications as read',
            statusCode: 500
        });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        // Extract userId based on user type
        let userId;
        let userType;
        
        if (req.user.role === 'admin') {
            userId = req.user.id || req.user.adminId;
            userType = 'admin';
        } else if (req.user.agentId) {
            userId = req.user.agentId;
            userType = 'agent';
        } else if (req.user.memberId) {
            userId = req.user.memberId;
            userType = 'member';
        } else {
            // If we can't determine the user ID, return an error
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID',
                statusCode: 400
            });
        }
        
        const result = await getUnreadNotificationCount(userId, userType);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get unread count error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve unread notification count',
            statusCode: 500
        });
    }
}; 