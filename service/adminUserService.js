import { Member } from '../schema/memberSchema.js';
import { Agent } from '../schema/AgentSchema.js';
import { messageHandler } from '../utils/index.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

// Get all users (members and agents) with pagination and filtering
export const getAllUsersService = async (query) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            userType = 'all', 
            status, 
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let memberData = { count: 0, rows: [] };
        let agentData = { count: 0, rows: [] };
        
        // Build filter conditions
        const memberWhere = {};
        const agentWhere = {};
        
        if (status) {
            memberWhere.memberStatus = status;
            agentWhere.status = status;
        }
        
        if (search) {
            const searchCondition = {
                [Op.or]: [
                    { email: { [Op.like]: `%${search}%` } },
                    { firstname: { [Op.like]: `%${search}%` } },
                    { lastname: { [Op.like]: `%${search}%` } }
                ]
            };
            
            Object.assign(memberWhere, searchCondition);
            
            // For agents, adjust the search fields
            const agentSearchCondition = {
                [Op.or]: [
                    { email: { [Op.like]: `%${search}%` } },
                    { companyName: { [Op.like]: `%${search}%` } },
                    { contactPerson: { [Op.like]: `%${search}%` } }
                ]
            };
            
            Object.assign(agentWhere, agentSearchCondition);
        }
        
        // Get members if requested
        if (userType === 'all' || userType === 'member') {
            memberData = await Member.findAndCountAll({
                where: memberWhere,
                attributes: [
                    'memberId', 'firstname', 'lastname', 'email', 
                    'phone', 'memberStatus', 'createdAt'
                ],
                limit: parseInt(limit),
                offset,
                order: [[sortBy, sortOrder]]
            });
        }
        
        // Get agents if requested
        if (userType === 'all' || userType === 'agent') {
            agentData = await Agent.findAndCountAll({
                where: agentWhere,
                attributes: [
                    'agentId', 'companyName', 'contactPerson', 'email', 
                    'phone', 'status', 'createdAt'
                ],
                limit: parseInt(limit),
                offset,
                order: [[sortBy, sortOrder]]
            });
        }
        
        // Combine and format results
        let users = [];
        let totalCount = 0;
        
        if (userType === 'all') {
            // Map members to a common format
            const formattedMembers = memberData.rows.map(member => ({
                id: member.memberId,
                type: 'member',
                name: `${member.firstname} ${member.lastname}`,
                email: member.email,
                phone: member.phone,
                status: member.memberStatus,
                createdAt: member.createdAt
            }));
            
            // Map agents to a common format
            const formattedAgents = agentData.rows.map(agent => ({
                id: agent.agentId,
                type: 'agent',
                name: agent.companyName,
                contactPerson: agent.contactPerson,
                email: agent.email,
                phone: agent.phone,
                status: agent.status,
                createdAt: agent.createdAt
            }));
            
            // Combine and sort
            users = [...formattedMembers, ...formattedAgents].sort((a, b) => {
                if (sortOrder === 'DESC') {
                    return new Date(b[sortBy]) - new Date(a[sortBy]);
                }
                return new Date(a[sortBy]) - new Date(b[sortBy]);
            });
            
            // Apply pagination to combined results
            users = users.slice(offset, offset + parseInt(limit));
            totalCount = memberData.count + agentData.count;
        } else if (userType === 'member') {
            users = memberData.rows.map(member => ({
                id: member.memberId,
                type: 'member',
                name: `${member.firstname} ${member.lastname}`,
                email: member.email,
                phone: member.phone,
                status: member.memberStatus,
                createdAt: member.createdAt
            }));
            totalCount = memberData.count;
        } else {
            users = agentData.rows.map(agent => ({
                id: agent.agentId,
                type: 'agent',
                name: agent.companyName,
                contactPerson: agent.contactPerson,
                email: agent.email,
                phone: agent.phone,
                status: agent.status,
                createdAt: agent.createdAt
            }));
            totalCount = agentData.count;
        }
        
        return messageHandler(
            'Users retrieved successfully',
            true,
            200,
            {
                users,
                pagination: {
                    totalItems: totalCount,
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    currentPage: parseInt(page),
                    pageSize: parseInt(limit)
                }
            }
        );
    } catch (error) {
        console.error('Get all users error:', error);
        return messageHandler(
            error.message || 'Failed to retrieve users',
            false,
            500
        );
    }
};

// Get user details by ID and type
export const getUserDetailsService = async (userId, userType) => {
    try {
        let user;
        
        if (userType === 'member') {
            user = await Member.findByPk(userId);
        } else if (userType === 'agent') {
            user = await Agent.findByPk(userId);
        } else {
            return messageHandler(
                'Invalid user type',
                false,
                400
            );
        }
        
        if (!user) {
            return messageHandler(
                'User not found',
                false,
                404
            );
        }
        
        return messageHandler(
            'User details retrieved successfully',
            true,
            200,
            user
        );
    } catch (error) {
        console.error('Get user details error:', error);
        return messageHandler(
            error.message || 'Failed to retrieve user details',
            false,
            500
        );
    }
};

// Update user status (activate/deactivate)
export const updateUserStatusService = async (userId, userType, status) => {
    try {
        let user;
        
        if (userType === 'member') {
            user = await Member.findByPk(userId);
            if (!user) {
                return messageHandler('Member not found', false, 404);
            }
            
            await user.update({ memberStatus: status });
        } else if (userType === 'agent') {
            user = await Agent.findByPk(userId);
            if (!user) {
                return messageHandler('Agent not found', false, 404);
            }
            
            await user.update({ status });
        } else {
            return messageHandler('Invalid user type', false, 400);
        }
        
        return messageHandler(
            `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
            true,
            200,
            user
        );
    } catch (error) {
        console.error('Update user status error:', error);
        return messageHandler(
            error.message || 'Failed to update user status',
            false,
            500
        );
    }
};

// Reset user password
export const resetUserPasswordService = async (userId, userType, newPassword) => {
    try {
        let user;
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        if (userType === 'member') {
            user = await Member.findByPk(userId);
            if (!user) {
                return messageHandler('Member not found', false, 404);
            }
            
            await user.update({ password: hashedPassword });
        } else if (userType === 'agent') {
            user = await Agent.findByPk(userId);
            if (!user) {
                return messageHandler('Agent not found', false, 404);
            }
            
            await user.update({ password: hashedPassword });
        } else {
            return messageHandler('Invalid user type', false, 400);
        }
        
        return messageHandler(
            'Password reset successfully',
            true,
            200
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return messageHandler(
            error.message || 'Failed to reset password',
            false,
            500
        );
    }
}; 