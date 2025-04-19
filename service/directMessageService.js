import { DirectMessage } from '../schema/DirectMessageSchema.js';
import { messageHandler } from '../utils/index.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';
import { Agent } from '../schema/AgentSchema.js';
import { Member } from '../schema/memberSchema.js';
import Admin from '../schema/AdminSchema.js';
import axios from 'axios';

export const createDirectMessage = async (messageData, files) => {
    try {
        console.log('Creating message with data:', messageData);
        console.log('Files:', files);
        
        // Validate required fields
        if (!messageData.senderId || !messageData.receiverId || !messageData.message) {
            return messageHandler("Missing required fields", false, 400);
        }

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
        return messageHandler(error.message || 'Failed to send message', false, 500);
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
        console.log('Getting conversations for:', { userId, userType });
        
        const partners = await sequelize.query(`
            SELECT DISTINCT
                CASE
                    WHEN senderId = :userId THEN receiverId
                    ELSE senderId
                END AS "partnerId",
                CASE
                    WHEN senderId = :userId THEN receiverType
                    ELSE senderType
                END AS "partnerType"
            FROM direct_messages
            WHERE 
                (senderId = :userId AND senderType = :userType) OR
                (receiverId = :userId AND receiverType = :userType)
        `, {
            replacements: { userId, userType },
            type: sequelize.QueryTypes.SELECT
        });

        if (!partners || partners.length === 0) {
            return {
                success: false,
                statusCode: 404,
                message: 'No conversations found'
            };
        }

        const conversations = await Promise.all(
            partners.map(async ({ partnerId, partnerType }) => {
                try {
                    const messages = await DirectMessage.findAll({
                        where: {
                            [Op.or]: [
                                {
                                    senderId: userId,
                                    senderType: userType,
                                    receiverId: partnerId,
                                    receiverType: partnerType
                                },
                                {
                                    senderId: partnerId,
                                    senderType: partnerType,
                                    receiverId: userId,
                                    receiverType: userType
                                }
                            ]
                        },
                        order: [['createdAt', 'DESC']],
                        limit: 1
                    });

                    let partnerDetails = null;
                    let partnerName = 'Unknown';
                    let partnerImage = null;
                    
                    if (partnerType === 'agent') {
                        partnerDetails = await Agent.findByPk(partnerId);
                        partnerName = partnerDetails?.companyName || 'Unknown';
                        partnerImage = partnerDetails?.photo || null;
                    } else if (partnerType === 'member') {
                        partnerDetails = await Member.findByPk(partnerId);
                        partnerName = partnerDetails ? `${partnerDetails.firstname} ${partnerDetails.lastname}`.trim() : 'Unknown';
                        partnerImage = partnerDetails?.photo || null;
                    } else if (partnerType === 'admin') {
                        partnerDetails = await Admin.findByPk(partnerId);
                        partnerName = partnerDetails?.name || 'Unknown';
                        partnerImage = partnerDetails?.photo || null;
                    }

                    return {
                        partnerId,
                        partnerType,
                        partnerName,
                        partnerImage,
                        lastMessage: messages[0]?.message,
                        timestamp: messages[0]?.createdAt,
                        unreadCount: await DirectMessage.count({
                            where: {
                                receiverId: userId,
                                receiverType: userType,
                                senderId: partnerId,
                                senderType: partnerType,
                                readAt: null
                            }
                        })
                    };
                } catch (error) {
                    console.error(`Error processing partner ${partnerId}:`, error);
                    return null;
                }
            })
        );

        const validConversations = conversations.filter(conv => conv !== null);
        
        return {
            success: true,
            statusCode: 200,
            data: validConversations
        };
    } catch (error) {
        console.error('Error in getAllUserConversations:', error);
        return {
            success: false,
            statusCode: 500,
            message: error.message || 'Failed to get conversations'
        };
    }
};

export const fetchConversations = (userType = 'member') => async (dispatch) => {
  try {
    const endpoint = userType === 'admin' 
      ? '/message/conversations' 
      : `/message/${userType}/conversations`;
    
    const response = await axios.get(endpoint);
    
    // Check if response has data property
    if (!response.data) {
      throw new Error('Invalid response format');
    }

    // Handle both array and object responses
    const responseData = Array.isArray(response.data) 
      ? response.data 
      : response.data.data || [];

    const conversations = responseData.map(convo => ({
      partnerId: convo.partnerId || convo.id,
      partnerType: convo.partnerType || userType,
      partnerName: convo.partnerName || convo.name,
      lastMessage: convo.lastMessage?.content || convo.lastMessage || '',
      timestamp: convo.lastMessage?.createdAt || convo.updatedAt || new Date().toISOString(),
      unreadCount: convo.unreadCount || 0,
      messages: convo.messages || []
    }));
    
    dispatch({
      type: `FETCH_${userType.toUpperCase()}_CONVERSATIONS_SUCCESS`,
      payload: conversations
    });

    return conversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    dispatch({
      type: `FETCH_${userType.toUpperCase()}_CONVERSATIONS_FAILURE`,
      payload: error.message
    });
    throw error;
  }
};