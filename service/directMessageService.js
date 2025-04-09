import { DirectMessage } from '../schema/DirectMessageSchema.js';
import { messageHandler } from '../utils/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

export const createDirectMessage = async (messageData, files) => {
    try {
        const attachments = files?.map(file => ({
            name: file.originalname,
            path: file.path
        })) || [];

        const message = await DirectMessage.create({
            ...messageData,
            attachments
        });

        return messageHandler('Message sent', true, 201, message);
    } catch (error) {
        console.error('Create message error:', error);
        return messageHandler('Failed to send message', false, 500);
    }
};

export const getConversationThread = async (userId, userType, otherId, otherType) => {
    try {
        const messages = await DirectMessage.findAll({
            where: {
                [Op.or]: [
                    {
                        senderId: userId,
                        senderType: userType,
                        receiverId: otherId,
                        receiverType: otherType
                    },
                    {
                        senderId: otherId,
                        senderType: otherType,
                        receiverId: userId,
                        receiverType: userType
                    }
                ]
            },
            order: [['createdAt', 'ASC']]
        });

        return messageHandler('Conversation retrieved', true, 200, messages);
    } catch (error) {
        console.error('Get conversation error:', error);
        return messageHandler('Failed to get conversation', false, 500);
    }
};

export const markAsRead = async (messageIds, userId, userType) => {
    try {
        await DirectMessage.update(
            { readAt: new Date() },
            {
                where: {
                    messageId: { [Op.in]: messageIds },
                    receiverId: userId,
                    receiverType: userType
                }
            }
        );

        return messageHandler('Messages marked as read', true, 200);
    } catch (error) {
        console.error('Mark as read error:', error);
        return messageHandler('Failed to mark messages as read', false, 500);
    }
};

export const getAllUserConversations = async (userId, userType) => {
    try {
        // Get all unique conversation partners
        const partners = await DirectMessage.findAll({
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('receiverId')), 'partnerId'],
                'receiverType'
            ],
            where: {
                senderId: userId,
                senderType: userType
            },
            raw: true
        });

        // Get conversation details for each partner
        const conversations = await Promise.all(
            partners.map(async (partner) => {
                const messages = await DirectMessage.findAll({
                    where: {
                        [Op.or]: [
                            {
                                senderId: userId,
                                senderType: userType,
                                receiverId: partner.partnerId,
                                receiverType: partner.receiverType
                            },
                            {
                                senderId: partner.partnerId,
                                senderType: partner.receiverType,
                                receiverId: userId,
                                receiverType: userType
                            }
                        ]
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 1 // Get only the last message
                });

                return {
                    partnerId: partner.partnerId,
                    partnerType: partner.receiverType,
                    lastMessage: messages[0]?.message || '',
                    timestamp: messages[0]?.createdAt || new Date(),
                    unreadCount: await DirectMessage.count({
                        where: {
                            senderId: partner.partnerId,
                            senderType: partner.receiverType,
                            receiverId: userId,
                            receiverType: userType,
                            readAt: null
                        }
                    })
                };
            })
        );

        return messageHandler(
            'Conversations retrieved successfully',
            true,
            200,
            conversations.sort((a, b) => b.timestamp - a.timestamp)
        );
    } catch (error) {
        console.error('Get conversations error:', error);
        return messageHandler('Failed to retrieve conversations', false, 500);
    }
}; 