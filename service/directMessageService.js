import { DirectMessage } from '../schema/DirectMessageSchema.js';
import { messageHandler } from '../utils/index.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';
import { Agent } from '../schema/AgentSchema.js';
import { Member } from '../schema/memberSchema.js';
import Admin from '../schema/AdminSchema.js';
import axios from 'axios';
import { MESSAGES } from '../config/constants.js';
import { sendEmail } from '../utils/sendEmail.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Helper function to get user details by type and ID
const getUserDetails = async (userId, userType) => {
    try {
        let user;
        switch (userType) {
            case 'admin':
                user = await Admin.findByPk(userId);
                break;
            case 'agent':
                user = await Agent.findByPk(userId);
                break;
            case 'member':
            case 'student':
                user = await Member.findByPk(userId);
                break;
            default:
                return null;
        }
        return user ? {
            name: user.name || user.fullName || 'User',
            email: user.email
        } : null;
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
};

export const createDirectMessage = async (messageData, files) => {
    const transaction = await sequelize.transaction();
    
    try {
        console.log('Creating message with data:', messageData);
        
        // Validate required fields
        if (!messageData.senderId || !messageData.receiverId || !messageData.message) {
            await transaction.rollback();
            return messageHandler("Missing required fields", false, 400);
        }

        const attachments = files?.map(file => ({
            name: file.originalname,
            path: file.path
        })) || [];

        const message = await DirectMessage.create({
            ...messageData,
            attachments
        }, { transaction });

        // Get sender and receiver details for email notification
        const [sender, receiver] = await Promise.all([
            getUserDetails(messageData.senderId, messageData.senderType),
            getUserDetails(messageData.receiverId, messageData.receiverType)
        ]);

        // If we have both sender and receiver with email, send notification
        if (sender && receiver && receiver.email) {
            try {
                const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
                
                await sendEmail({
                    to: receiver.email,
                    subject: `New message from ${sender.name}`,
                    template: 'newMessage',
                    context: {
                        recipientName: receiver.name,
                        senderName: sender.name,
                        message: messageData.message,
                        loginUrl
                    }
                });
                
                console.log(`Notification email sent to ${receiver.email}`);
            } catch (emailError) {
                console.error('Failed to send notification email:', emailError);
                // Don't fail the whole operation if email sending fails
            }
        }

        await transaction.commit();
        return messageHandler('Message sent', true, 201, message);
    } catch (error) {
        console.error('Create message error:', error);
        return messageHandler(error.message || 'Failed to send message', false, 500);
    }
};

export const getConversationThread = async (userId, userType, otherId, otherType) => {
    try {
        // Validate parameters
        if (!userId || !userType || !otherId || !otherType) {
            return messageHandler('Missing required parameters', false, 400);
        }

        // Validate user types
        const validUserTypes = ['admin', 'agent', 'member', 'student'];
        if (!validUserTypes.includes(userType) || !validUserTypes.includes(otherType)) {
            return messageHandler('Invalid user type', false, 400);
        }

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

        // Return with messageHandler instead of raw messages
        return messageHandler('Conversation retrieved successfully', true, 200, messages);
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
        // Validate userId and userType
        if (!userId || isNaN(userId) || !userType) {
            return {
                success: false,
                statusCode: 400,
                message: 'Invalid user ID or user type'
            };
        }

        // Convert userId to number if it's a string
        const numericUserId = Number(userId);
        if (isNaN(numericUserId)) {
            return {
                success: false,
                statusCode: 400,
                message: 'Invalid user ID format'
            };
        }

        console.log('Getting conversations for:', { userId: numericUserId, userType });
        
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
            replacements: { userId: numericUserId, userType },
            type: sequelize.QueryTypes.SELECT
        });

        if (!partners || partners.length === 0) {
            return {
                success: false,
                statusCode: 400,
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

export const getDirectMessages = async (userId, userType, partnerId, partnerType) => {
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
            order: [['createdAt', 'ASC']]
        });

        return {
            success: true,
            statusCode: 200,
            data: messages
        };
    } catch (error) {
        console.error('Get direct messages error:', error);
        return {
            success: false,
            statusCode: 500,
            message: 'Failed to get messages'
        };
    }
};