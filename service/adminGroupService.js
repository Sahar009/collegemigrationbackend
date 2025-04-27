import AdminGroup from '../schema/AdminGroupSchema.js';
import AdminMessage from '../schema/AdminMessageSchema.js';
import Admin from '../schema/AdminSchema.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';

export const addMembersToGroup = async (groupId, memberIds) => {
    try {
        const group = await AdminGroup.findByPk(groupId);
        if (!group) throw new Error('Group not found');

        // Verify members exist
        const existingAdmins = await Admin.findAll({
            where: { adminId: memberIds },
            attributes: ['adminId']
        });
        const validIds = existingAdmins.map(a => a.adminId);

        const currentMembers = group.members || [];
        const newMembers = [...new Set([...currentMembers, ...validIds])];
        
        return group.update({ members: newMembers });
    } catch (error) {
        throw error;
    }
};

export const removeMembersFromGroup = async (groupId, memberIds) => {
    try {
        const group = await AdminGroup.findByPk(groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        // Remove specified members
        const currentMembers = group.members || [];
        const updatedMembers = currentMembers.filter(memberId => !memberIds.includes(memberId));
        
        await group.update({ members: updatedMembers });
        return group;
    } catch (error) {
        throw error;
    }
};

export const getAllAdmins = async () => {
    try {
        const admins = await Admin.findAll({
            attributes: ['adminId', 'username', 'email', 'fullName']
        });
        return admins;
    } catch (error) {
        throw error;
    }
};

export const markMessageAsRead = async (messageId, adminId) => {
    try {
        const message = await AdminMessage.findByPk(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        // Check if message is already read by this admin
        const readBy = message.readBy || [];
        if (!readBy.includes(adminId)) {
            await message.update({
                readBy: [...readBy, adminId]
            });
        }
        
        return message;
    } catch (error) {
        throw error;
    }
};

export const getUnreadMessages = async (adminId) => {
    try {
        const groups = await AdminGroup.findAll({
            where: sequelize.literal(
                `JSON_CONTAINS(members, JSON_ARRAY(${adminId}))`
            ),
            attributes: ['groupId']
        });

        const groupIds = groups.map(group => group.groupId);
        
        const unreadMessages = await AdminMessage.findAll({
            where: {
                [Op.or]: [
                    { receiverId: adminId },
                    { groupId: { [Op.in]: groupIds } }
                ],
                [Op.and]: [
                    sequelize.literal(
                        `(readBy IS NULL OR NOT JSON_CONTAINS(readBy, JSON_ARRAY(${adminId})))`
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
            ]
        });

        return unreadMessages;
    } catch (error) {
        throw error;
    }
}; 