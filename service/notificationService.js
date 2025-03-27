import Notification from '../schema/NotificationSchema.js';
import { messageHandler } from '../utils/index.js';

/**
 * Create a new notification
 * @param {Object} data - Notification data
 * @returns {Object} Response object
 */
export const createNotification = async (data) => {
    try {
        const notification = await Notification.create({
            userId: data.userId,
            userType: data.userType,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link,
            priority: data.priority || 0,
            metadata: data.metadata || {}
        });

        return messageHandler(
            'Notification created successfully',
            true,
            201,
            notification
        );
    } catch (error) {
        console.error('Create notification error:', error);
        return messageHandler(
            'Failed to create notification',
            false,
            500
        );
    }
};

/**
 * Get notifications for a user
 * @param {number} userId - User ID
 * @param {string} userType - User type (member or agent)
 * @param {Object} query - Query parameters
 * @returns {Object} Response object
 */
export const getUserNotifications = async (userId, userType, query = {}) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status,
            type
        } = query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build where conditions
        const whereConditions = {
            userId,
            userType
        };
        
        if (status) {
            whereConditions.status = status;
        }
        
        if (type) {
            whereConditions.type = type;
        }
        
        // Get notifications
        const { count, rows } = await Notification.findAndCountAll({
            where: whereConditions,
            order: [
                ['priority', 'DESC'],
                ['createdAt', 'DESC']
            ],
            limit: parseInt(limit),
            offset
        });
        
        return messageHandler(
            'Notifications retrieved successfully',
            true,
            200,
            {
                notifications: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / parseInt(limit))
                }
            }
        );
    } catch (error) {
        console.error('Get notifications error:', error);
        return messageHandler(
            'Failed to retrieve notifications',
            false,
            500
        );
    }
};

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID
 * @param {string} userType - User type (member or agent)
 * @returns {Object} Response object
 */
export const markNotificationAsRead = async (notificationId, userId, userType) => {
    try {
        const notification = await Notification.findOne({
            where: {
                id: notificationId,
                userId,
                userType
            }
        });
        
        if (!notification) {
            return messageHandler('Notification not found', false, 404);
        }
        
        await notification.update({ status: 'read' });
        
        return messageHandler(
            'Notification marked as read',
            true,
            200,
            notification
        );
    } catch (error) {
        console.error('Mark notification as read error:', error);
        return messageHandler(
            'Failed to mark notification as read',
            false,
            500
        );
    }
};

/**
 * Mark all notifications as read
 * @param {number} userId - User ID
 * @param {string} userType - User type (member or agent)
 * @returns {Object} Response object
 */
export const markAllNotificationsAsRead = async (userId, userType) => {
    try {
        await Notification.update(
            { status: 'read' },
            {
                where: {
                    userId,
                    userType,
                    status: 'unread'
                }
            }
        );
        
        return messageHandler(
            'All notifications marked as read',
            true,
            200
        );
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        return messageHandler(
            'Failed to mark all notifications as read',
            false,
            500
        );
    }
};

/**
 * Get unread notification count
 * @param {number} userId - User ID
 * @param {string} userType - User type (member or agent)
 * @returns {Object} Response object
 */
export const getUnreadNotificationCount = async (userId, userType) => {
    try {
        const count = await Notification.count({
            where: {
                userId,
                userType,
                status: 'unread'
            }
        });
        
        return messageHandler(
            'Unread notification count retrieved successfully',
            true,
            200,
            { count }
        );
    } catch (error) {
        console.error('Get unread notification count error:', error);
        return messageHandler(
            'Failed to retrieve unread notification count',
            false,
            500
        );
    }
}; 