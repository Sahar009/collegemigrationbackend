import {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount
} from '../service/notificationService.js';
import jwt from 'jsonwebtoken';

/**
 * Helper function to extract user info from request
 * @param {Object} req - Request object
 * @returns {Object} User info object with userId and userType
 */
const extractUserInfo = (req) => {
    let userId, userType;
    
    // First try to get user info from req.user
    if (req.user) {
        console.log('User object exists:', req.user);
        
        if (req.user.role === 'admin') {
            userId = req.user.id || req.user.adminId;
            userType = 'admin';
        } else if (req.user.type === 'agent' || req.user.agentId) {
            userId = req.user.id || req.user.agentId;
            userType = 'agent';
        } else {
            userId = req.user.id || req.user.memberId;
            userType = 'member';
        }
        
        return { userId, userType };
    }
    
    // If req.user is not available, try to extract from query params or token
    userType = req.query.userType || req.body.userType || 'member';
    
    // Try to extract userId from token
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id || decoded.memberId || decoded.agentId;
            console.log('Extracted user ID from token:', userId);
        }
    } catch (error) {
        console.error('Token verification error:', error);
        throw new Error('Unauthorized: Invalid token');
    }
    
    if (!userId) {
        throw new Error('User ID is required');
    }
    
    return { userId, userType };
};

/**
 * Get notifications for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getNotifications = async (req, res) => {
    try {
        console.log('User object in notification controller:', req.user);
        
        // Extract user info using the helper function
        const { userId, userType } = extractUserInfo(req);
        
        console.log(`Fetching notifications for ${userType} with ID ${userId}`);
        
        const result = await getUserNotifications(userId, userType, req.query);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get notifications error:', error);
        
        // Handle authentication errors
        if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
            return res.status(401).json({
                success: false,
                message: error.message,
                statusCode: 401
            });
        }
        
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve notifications',
            statusCode: 500
        });
    }
};

/**
 * Mark a notification as read
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const readNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        
        // Extract user info using the helper function
        const { userId, userType } = extractUserInfo(req);
        
        const result = await markNotificationAsRead(notificationId, userId, userType);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Read notification error:', error);
        
        // Handle authentication errors
        if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
            return res.status(401).json({
                success: false,
                message: error.message,
                statusCode: 401
            });
        }
        
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark notification as read',
            statusCode: 500
        });
    }
};

/**
 * Mark all notifications as read
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const readAllNotifications = async (req, res) => {
    try {
        // Extract user info using the helper function
        const { userId, userType } = extractUserInfo(req);
        
        const result = await markAllNotificationsAsRead(userId, userType);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Read all notifications error:', error);
        
        // Handle authentication errors
        if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
            return res.status(401).json({
                success: false,
                message: error.message,
                statusCode: 401
            });
        }
        
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark all notifications as read',
            statusCode: 500
        });
    }
};

/**
 * Get unread notification count
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getUnreadCount = async (req, res) => {
    try {
        // Extract user info using the helper function
        const { userId, userType } = extractUserInfo(req);
        
        const result = await getUnreadNotificationCount(userId, userType);
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Get unread count error:', error);
        
        // Handle authentication errors
        if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
            return res.status(401).json({
                success: false,
                message: error.message,
                statusCode: 401
            });
        }
        
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get unread notification count',
            statusCode: 500
        });
    }
}; 