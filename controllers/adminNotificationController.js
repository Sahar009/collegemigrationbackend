import { 
    sendBulkNotifications,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount
} from '../service/notificationService.js';
import Notification from '../schema/NotificationSchema.js';
import { messageHandler } from '../utils/index.js';
import sequelize from '../database/db.js';
import { Op } from 'sequelize';

/**
 * Send notifications to multiple users
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const sendNotifications = async (req, res) => {
    try {
        const { 
            title, 
            message, 
            type = 'system', 
            link, 
            priority = 1,
            metadata = {},
            userTypes = 'all',
            specificUserIds = null
        } = req.body;
        
        // Validate required fields
        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Title and message are required',
                statusCode: 400
            });
        }
        
        // Store the notification template for future reference
        const notificationTemplate = await Notification.create({
            userId: req.user.adminId || req.user.id, // Admin ID who sent it
            userType: 'admin',
            type: type,
            title: title,
            message: message,
            link: link,
            priority: priority,
            status: 'read', // Mark as read since it's just a template
            metadata: {
                ...metadata,
                isBroadcast: true,
                sentTo: Array.isArray(userTypes) ? userTypes : [userTypes],
                sentBy: req.user.username || req.user.email,
                sentAt: new Date()
            }
        });
        
        const result = await sendBulkNotifications(
            { 
                title, 
                message, 
                type, 
                link, 
                priority, 
                metadata,
                templateId: notificationTemplate.id 
            },
            userTypes,
            specificUserIds
        );
        
        // Add the template ID to the result
        if (result.success) {
            result.data = {
                ...result.data,
                templateId: notificationTemplate.id
            };
        }
        
        return res.status(result.statusCode).json(result);
    } catch (error) {
        console.error('Send notifications error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send notifications',
            statusCode: 500
        });
    }
};

/**
 * Get sent broadcast notifications (admin only)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getSentNotifications = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10,
            type,
            startDate,
            endDate
        } = req.query;
        
        console.log('Query params:', req.query);
        
        // Build where conditions
        const whereConditions = {
            userType: 'admin',
            // Use JSON_EXTRACT for MySQL to query inside JSON
            metadata: {
                [Op.not]: null // Ensure metadata exists
            }
        };
        
        if (type) {
            whereConditions.type = type;
        }
        
        // Add date range filter if provided
        if (startDate && endDate) {
            whereConditions.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            whereConditions.createdAt = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            whereConditions.createdAt = {
                [Op.lte]: new Date(endDate)
            };
        }
        
        console.log('Where conditions:', JSON.stringify(whereConditions));
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Get notifications
        const { count, rows } = await Notification.findAndCountAll({
            where: whereConditions,
            order: [
                ['createdAt', 'DESC']
            ],
            limit: parseInt(limit),
            offset
        });
        
        console.log(`Found ${count} notifications`);
        
        // Filter the results to only include those with isBroadcast=true in metadata
        const broadcastNotifications = rows.filter(notification => {
            try {
                const metadata = notification.metadata || {};
                return metadata.isBroadcast === true;
            } catch (e) {
                console.error('Error parsing metadata:', e);
                return false;
            }
        });
        
        console.log(`Filtered to ${broadcastNotifications.length} broadcast notifications`);
        
        // Format the response
        const formattedNotifications = broadcastNotifications.map(notification => {
            const metadata = notification.metadata || {};
            return {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                link: notification.link,
                priority: notification.priority,
                sentTo: metadata.sentTo || [],
                sentBy: metadata.sentBy || 'System',
                sentAt: metadata.sentAt || notification.createdAt,
                recipientCount: metadata.recipientCount || 0,
                createdAt: notification.createdAt
            };
        });
        
        return res.status(200).json(
            messageHandler(
                'Sent notifications retrieved successfully',
                true,
                200,
                {
                    notifications: formattedNotifications,
                    pagination: {
                        total: broadcastNotifications.length,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: Math.ceil(broadcastNotifications.length / parseInt(limit))
                    }
                }
            )
        );
    } catch (error) {
        console.error('Get sent notifications error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve sent notifications',
            statusCode: 500
        });
    }
};

/**
 * Delete a notification (admin only)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        
        const notification = await Notification.findByPk(notificationId);
        
        if (!notification) {
            return res.status(404).json(
                messageHandler(
                    'Notification not found',
                    false,
                    404
                )
            );
        }
        
        await notification.destroy();
        
        return res.status(200).json(
            messageHandler(
                'Notification deleted successfully',
                true,
                200
            )
        );
    } catch (error) {
        console.error('Delete notification error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete notification',
            statusCode: 500
        });
    }
};

/**
 * Get notification statistics (admin only)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getNotificationStats = async (req, res) => {
    try {
        // Get total count of notifications
        const totalCount = await Notification.count();
        
        // Get count by user type
        const countByUserType = await Notification.findAll({
            attributes: [
                'userType',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['userType']
        });
        
        // Get count by notification type
        const countByType = await Notification.findAll({
            attributes: [
                'type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['type']
        });
        
        // Get count by status
        const countByStatus = await Notification.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status']
        });
        
        // Get count of notifications sent in the last 7 days
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        
        const recentCount = await Notification.count({
            where: {
                createdAt: {
                    [Op.gte]: last7Days
                }
            }
        });
        
        return res.status(200).json(
            messageHandler(
                'Notification statistics retrieved successfully',
                true,
                200,
                {
                    totalCount,
                    countByUserType: countByUserType.map(item => ({
                        userType: item.userType,
                        count: parseInt(item.get('count'))
                    })),
                    countByType: countByType.map(item => ({
                        type: item.type,
                        count: parseInt(item.get('count'))
                    })),
                    countByStatus: countByStatus.map(item => ({
                        status: item.status,
                        count: parseInt(item.get('count'))
                    })),
                    recentCount
                }
            )
        );
    } catch (error) {
        console.error('Get notification stats error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve notification statistics',
            statusCode: 500
        });
    }
}; 