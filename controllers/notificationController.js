import {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount
} from '../service/notificationService.js';

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const userType = req.user.role === 'admin' ? 'admin' : (req.user.role === 'agent' ? 'agent' : 'member');
        
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
        const userId = req.user.id;
        const userType = req.user.role === 'admin' ? 'admin' : (req.user.role === 'agent' ? 'agent' : 'member');
        
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
        const userId = req.user.id;
        const userType = req.user.role === 'admin' ? 'admin' : (req.user.role === 'agent' ? 'agent' : 'member');
        
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
        const userId = req.user.id;
        const userType = req.user.role === 'admin' ? 'admin' : (req.user.role === 'agent' ? 'agent' : 'member');
        
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