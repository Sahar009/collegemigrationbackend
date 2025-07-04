import AdminMessage from '../schema/AdminMessageSchema.js';
import AdminGroup from '../schema/AdminGroupSchema.js';
import Admin from '../schema/AdminSchema.js';
import { messageHandler } from '../utils/index.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';
import { sendEmail } from '../utils/sendEmail.js';

export const sendAdminMessage = async (messageData, files) => {
    try {
        // Validate required fields
        if (!messageData.senderId || !messageData.message) {
            return messageHandler("Missing required fields", false, 400);
        }

        // Convert isGroupMessage to boolean if it's a string
        const isGroupMessage = messageData.isGroupMessage === 'true' || messageData.isGroupMessage === true;

        // For direct messages, ensure receiverId is present
        if (!isGroupMessage && !messageData.receiverId) {
            return messageHandler("Receiver ID is required for direct messages", false, 400);
        }

        // For group messages, validate group exists
        if (isGroupMessage) {
            if (!messageData.groupId) {
                return messageHandler("Group ID is required for group messages", false, 400);
            }
            const group = await AdminGroup.findByPk(messageData.groupId);
            if (!group) {
                return messageHandler("Group not found", false, 404);
            }
        }

        const attachments = files?.map(file => ({
            name: file.originalname,
            path: file.path
        })) || [];

        // Prepare message data
        const messagePayload = {
            senderId: messageData.senderId,
            message: messageData.message,
            attachments,
            readBy: [messageData.senderId], // Initialize readBy with sender
            isGroupMessage: isGroupMessage
        };

        // Add groupId or receiverId based on message type
        if (isGroupMessage) {
            messagePayload.groupId = messageData.groupId;
        } else {
            messagePayload.receiverId = messageData.receiverId;
        }

        const message = await AdminMessage.create(messagePayload);

        // Send email notification to the recipient
        if (!isGroupMessage) {
            try {
                // Get sender and receiver details for email
                const [sender, receiver] = await Promise.all([
                    Admin.findByPk(messageData.senderId, {
                        attributes: ['adminId', 'username', 'fullName', 'email']
                    }),
                    Admin.findByPk(messageData.receiverId, {
                        attributes: ['adminId', 'username', 'fullName', 'email']
                    })
                ]);

                if (receiver && receiver.email) {
                    const emailContext = {
                        recipientName: receiver.fullName || receiver.username,
                        senderName: sender?.fullName || sender?.username || 'An administrator',
                        message: messageData.message.length > 100 
                            ? messageData.message.substring(0, 100) + '...' 
                            : messageData.message,
                        loginUrl: `${process.env.FRONTEND_URL || 'https://your-frontend-url.com'}/admin/messages`
                    };

                    await sendEmail({
                        to: receiver.email,
                        subject: `New Message from ${emailContext.senderName}`,
                        template: 'newMessage',
                        context: emailContext
                    });
                }
            } catch (emailError) {
                console.error('Failed to send message notification email:', emailError);
                // Don't fail the message sending if email fails
            }
        } else {
            // For group messages, notify all group members except the sender
            try {
                const group = await AdminGroup.findByPk(messageData.groupId, {
                    include: [{
                        model: Admin,
                        as: 'members',
                        attributes: ['adminId', 'username', 'fullName', 'email'],
                        through: { attributes: [] } // Exclude junction table attributes
                    }]
                });

                if (group && group.members && group.members.length > 0) {
                    const sender = await Admin.findByPk(messageData.senderId, {
                        attributes: ['adminId', 'username', 'fullName']
                    });

                    // Send to all members except the sender
                    const recipients = group.members.filter(member => 
                        member.adminId !== messageData.senderId && member.email
                    );

                    if (recipients.length > 0) {
                        const emailPromises = recipients.map(recipient => {
                            const emailContext = {
                                recipientName: recipient.fullName || recipient.username,
                                senderName: sender?.fullName || sender?.username || 'A team member',
                                groupName: group.name,
                                message: messageData.message.length > 100 
                                    ? messageData.message.substring(0, 100) + '...' 
                                    : messageData.message,
                                loginUrl: `${process.env.FRONTEND_URL || 'https://your-frontend-url.com'}/admin/group-messages/${group.groupId}`
                            };

                            return sendEmail({
                                to: recipient.email,
                                subject: `New Message in ${group.name}`,
                                template: 'newMessage',
                                context: emailContext
                            });
                        });

                        await Promise.all(emailPromises);
                    }
                }
            } catch (groupEmailError) {
                console.error('Failed to send group message notification emails:', groupEmailError);
                // Don't fail the message sending if emails fail
            }
        }

        return messageHandler('Message sent', true, 201, message);
    } catch (error) {
        console.error('Send admin message error:', error);
        return messageHandler(error.message || 'Failed to send message', false, 500);
    }
};

export const getAdminConversation = async (senderId, receiverId) => {
    try {
        // Convert to numbers immediately
        const parsedSender = Number(senderId);
        const parsedReceiver = Number(receiverId);

        if (!Number.isInteger(parsedSender) || !Number.isInteger(parsedReceiver)) {
            return messageHandler('Invalid user ID format', false, 400);
        }

        // Verify both users exist
        const [sender, receiver] = await Promise.all([
            Admin.findByPk(parsedSender),
            Admin.findByPk(parsedReceiver)
        ]);

        if (!sender || !receiver) {
            return messageHandler('One or both users not found', false, 404);
        }

        const messages = await AdminMessage.findAll({
            where: {
                [Op.or]: [
                    {
                        senderId: parsedSender,
                        receiverId: parsedReceiver,
                        isGroupMessage: false
                    },
                    {
                        senderId: parsedReceiver,
                        receiverId: parsedSender,
                        isGroupMessage: false
                    }
                ]
            },
            order: [['createdAt', 'ASC']],
            include: [
                {
                    model: Admin,
                    as: 'sender',
                    attributes: ['adminId', 'username', 'fullName']
                },
                {
                    model: Admin,
                    as: 'receiver',
                    attributes: ['adminId', 'username', 'fullName']
                }
            ]
        });

        // Mark messages as read
        const unreadMessages = messages.filter(
            msg => msg.receiverId === parsedSender && !msg.readBy?.includes(parsedSender)
        );

        if (unreadMessages.length > 0) {
            await Promise.all(unreadMessages.map(async (msg) => {
                const readBy = msg.readBy || [];
                if (!readBy.includes(parsedSender)) {
                    readBy.push(parsedSender);
                    await msg.update({ readBy });
                }
            }));
        }
        console.log(messages);
        return messageHandler('Conversation retrieved', true, 200, messages);
    } catch (error) {
        console.error('Get admin conversation error:', error);
        return messageHandler(error.message || 'Failed to get conversation', false, 500);
    }
};

export const getAdminGroupMessages = async (groupId) => {
    try {
        const messages = await AdminMessage.findAll({
            where: {
                groupId,
                isGroupMessage: true
            },
            order: [['createdAt', 'ASC']],
            include: [
                {
                    model: Admin,
                    as: 'sender',
                    attributes: ['adminId', 'username', 'fullName']
                }
            ]
        });

        return messageHandler('Group messages retrieved', true, 200, messages);
    } catch (error) {
        console.error('Get admin group messages error:', error);
        return messageHandler('Failed to get group messages', false, 500);
    }
};

export const createAdminGroup = async (groupData) => {
    try {
        const { groupName, description, members, createdBy } = groupData;
        
        // Validate members exist
        const existingAdmins = await Admin.findAll({
            where: { adminId: [...members, createdBy] },
            attributes: ['adminId']
        });
        const validMembers = existingAdmins.map(a => a.adminId);
        
        const group = await AdminGroup.create({
            groupName,
            description: description || '',
            members: validMembers,
            createdBy
        });

        return messageHandler('Group created', true, 201, 
            await AdminGroup.findByPk(group.groupId, {
                include: [{ model: Admin, as: 'creator' }]
            })
        );
    } catch (error) {
        console.error('Create group error:', error);
        return messageHandler(error.message, false, 400);
    }
};

export const getAdminConversations = async (adminId) => {
    try {
        const numericAdminId = Number(adminId);
        // First get all messages where the admin is either sender or receiver
        const messages = await AdminMessage.findAll({
            where: {
                [Op.or]: [
                    { senderId: numericAdminId },
                    { receiverId: numericAdminId }
                ],
                isGroupMessage: false
            },
            include: [
                {
                    model: Admin,
                    as: 'sender',
                    attributes: ['adminId', 'username', 'fullName']
                },
                {
                    model: Admin,
                    as: 'receiver',
                    attributes: ['adminId', 'username', 'fullName']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Group messages by conversation partner
        const conversationsMap = new Map();

        messages.forEach(message => {
            const partnerId = message.senderId === numericAdminId ? message.receiverId : message.senderId;
            const partner = message.senderId === numericAdminId ? message.receiver : message.sender;

            if (!conversationsMap.has(partnerId)) {
                conversationsMap.set(partnerId, {
                    partnerId,
                    partnerName: partner?.fullName || 'Unknown',
                    lastMessage: message.message,
                    timestamp: message.createdAt,
                    unreadCount: message.receiverId === numericAdminId && !message.readBy?.includes(numericAdminId) ? 1 : 0
                });
            } else if (message.receiverId === numericAdminId && !message.readBy?.includes(numericAdminId)) {
                const conv = conversationsMap.get(partnerId);
                conv.unreadCount += 1;
            }
        });

        const conversations = Array.from(conversationsMap.values());
        conversations.sort((a, b) => b.timestamp - a.timestamp);

        return messageHandler('Conversations retrieved', true, 200, conversations);
    } catch (error) {
        console.error('Get admin conversations error:', error);
        return messageHandler('Failed to get conversations', false, 500);
    }
};

export const getAdminGroups = async (adminId) => {
    try {
        const groups = await AdminGroup.findAll({
            where: sequelize.literal(
                `JSON_CONTAINS(members, CAST('${adminId}' AS JSON), '$')`
            ),
            include: [
                {
                    model: Admin,
                    as: 'creator',
                    attributes: ['adminId', 'username', 'fullName']
                }
            ]
        });

        return messageHandler('Groups retrieved', true, 200, groups);
    } catch (error) {
        console.error('Get admin groups error:', error);
        return messageHandler('Failed to get groups', false, 500);
    }
};

export const getUnreadMessages = async (adminId) => {
    try {
        // Validate adminId
        if (!adminId || isNaN(adminId)) {
            throw new Error('Invalid admin ID');
        }

        const numericAdminId = Number(adminId);

        // Get groups where admin is a member using MySQL JSON_CONTAINS
        const groups = await AdminGroup.findAll({
            where: sequelize.literal(
                `JSON_CONTAINS(members, CAST('${numericAdminId}' AS JSON))`
            ),
            attributes: ['groupId']
        });

        const groupIds = groups.map(group => group.groupId);
        
        // Get unread messages using MySQL JSON_CONTAINS
        const unreadMessages = await AdminMessage.findAll({
            where: {
                [Op.or]: [
                    { receiverId: numericAdminId },
                    { groupId: { [Op.in]: groupIds } }
                ],
                [Op.and]: [
                    sequelize.literal(
                        `(readBy IS NULL OR NOT JSON_CONTAINS(readBy, CAST('${numericAdminId}' AS JSON)))`
                    )
                ]
            },
            include: [
                {
                    model: Admin,
                    as: 'sender',
                    attributes: ['adminId', 'username', 'fullName']
                },
                {
                    model: AdminGroup,
                    as: 'group',
                    attributes: ['groupId', 'groupName']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return unreadMessages;
    } catch (error) {
        console.error('Error in getUnreadMessages:', error);
        throw error;
    }
}; 