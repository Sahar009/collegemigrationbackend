import Notification from '../schema/NotificationSchema.js';
import { messageHandler } from '../utils/index.js';
import sequelize from '../database/db.js';


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


export const sendBulkNotifications = async (data, userTypes = 'all', specificUserIds = null) => {
    try {
        // Validate required fields
        if (!data.title || !data.message || !data.type) {
            return messageHandler(
                'Title, message, and type are required',
                false,
                400
            );
        }

        // Normalize userTypes to array
        const targetUserTypes = userTypes === 'all' 
            ? ['member', 'agent', 'admin'] 
            : (Array.isArray(userTypes) ? userTypes : [userTypes]);
        
        // Validate user types
        const validUserTypes = ['member', 'agent', 'admin'];
        const invalidTypes = targetUserTypes.filter(type => !validUserTypes.includes(type));
        if (invalidTypes.length > 0) {
            return messageHandler(
                `Invalid user types: ${invalidTypes.join(', ')}`,
                false,
                400
            );
        }

        let notificationCount = 0;
        
        // If specific user IDs are provided
        if (specificUserIds && Array.isArray(specificUserIds) && specificUserIds.length > 0) {
            // Create notifications for specific users
            for (const user of specificUserIds) {
                if (!user.userId || !user.userType) {
                    console.warn('Skipping invalid user entry:', user);
                    continue;
                }
                
                if (!targetUserTypes.includes(user.userType)) {
                    console.warn(`Skipping user of type ${user.userType} as it's not in target types`);
                    continue;
                }
                
                await Notification.create({
                    userId: user.userId,
                    userType: user.userType,
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    link: data.link || null,
                    priority: data.priority || 0,
                    metadata: data.metadata || {}
                });
                
                notificationCount++;
            }
        } else {
            // Send to all users of specified types
            for (const userType of targetUserTypes) {
                let userIds = [];
                
                // Get all user IDs of this type
                if (userType === 'member') {
                    const members = await sequelize.query(
                        'SELECT memberId FROM member_personal_information',
                        { type: sequelize.QueryTypes.SELECT }
                    );
                    userIds = members.map(m => m.memberId);
                } else if (userType === 'agent') {
                    const agents = await sequelize.query(
                        'SELECT agentId FROM agents',
                        { type: sequelize.QueryTypes.SELECT }
                    );
                    userIds = agents.map(a => a.agentId);
                } else if (userType === 'admin') {
                    // Use the correct table name 'admin_users' and column 'adminId'
                    const admins = await sequelize.query(
                        'SELECT adminId FROM admin_users',
                        { type: sequelize.QueryTypes.SELECT }
                    );
                    userIds = admins.map(a => a.adminId);
                }
                
                // Create notifications for each user
                for (const userId of userIds) {
                    await Notification.create({
                        userId,
                        userType,
                        type: data.type,
                        title: data.title,
                        message: data.message,
                        link: data.link || null,
                        priority: data.priority || 0,
                        metadata: data.metadata || {}
                    });
                    
                    notificationCount++;
                }
            }
        }
        
        return messageHandler(
            `Successfully sent ${notificationCount} notifications`,
            true,
            200,
            { count: notificationCount }
        );
    } catch (error) {
        console.error('Send bulk notifications error:', error);
        return messageHandler(
            error.message || 'Failed to send notifications',
            false,
            500
        );
    }
}; 