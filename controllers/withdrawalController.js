import Withdrawal from '../schema/WithdrawalSchema.js';
import Wallet from '../schema/WalletSchema.js';
import { messageHandler } from '../utils/index.js';
import { createNotification } from '../service/notificationService.js';
import { Op } from 'sequelize';
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
 * Get user wallet balance
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getWalletBalance = async (req, res) => {
    try {
        // Extract user info using the helper function
        let { userId, userType } = extractUserInfo(req);
        
        console.log('User requesting wallet balance:', { userId, userType });
        
        // Get or create wallet
        let wallet = await Wallet.findOne({
            where: { userId, userType }
        });
        
        if (!wallet) {
            console.log('Creating new wallet for user:', { userId, userType });
            wallet = await Wallet.create({
                userId,
                userType,
                balance: 0.00
            });
        }
        
        return res.status(200).json(
            messageHandler(
                'Wallet balance retrieved successfully',
                true,
                200,
                {
                    balance: parseFloat(wallet.balance),
                    userId,
                    userType
                }
            )
        );
    } catch (error) {
        console.error('Get wallet balance error:', error);
        
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
            message: error.message || 'Failed to retrieve wallet balance',
            statusCode: 500
        });
    }
};

/**
 * Create withdrawal request
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const createWithdrawal = async (req, res) => {
    try {
        // Extract user info using the helper function
        let { userId, userType } = extractUserInfo(req);
        
        // Convert to proper case for Withdrawal schema (Member/Agent)
        const withdrawalUserType = userType === 'member' ? 'Member' : 'Agent';
        
        const { accountName, accountNumber, bankName, amount } = req.body;
        
        // Validate required fields
        if (!accountName || !accountNumber || !bankName || !amount) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
                statusCode: 400
            });
        }
        
        // Check if amount is valid
        if (isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid withdrawal amount',
                statusCode: 400
            });
        }
        
        // Get wallet - note we use lowercase userType for wallet
        const wallet = await Wallet.findOne({
            where: { userId, userType }
        });
        
        // Check if wallet exists and has sufficient balance
        if (!wallet) {
            return res.status(400).json({
                success: false,
                message: 'Wallet not found',
                statusCode: 400
            });
        }
        
        if (parseFloat(wallet.balance) < parseFloat(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance',
                statusCode: 400
            });
        }
        
        // Check if there's a pending withdrawal
        const pendingWithdrawal = await Withdrawal.findOne({
            where: {
                userId,
                userType: withdrawalUserType,
                status: 'Pending'
            }
        });
        
        if (pendingWithdrawal) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending withdrawal request',
                statusCode: 400
            });
        }
        
        // Create withdrawal request
        const withdrawal = await Withdrawal.create({
            userId,
            userType: withdrawalUserType,
            accountName,
            accountNumber,
            bankName,
            amount,
            status: 'Pending'
        });
        
        // Create notification for admin
        await createNotification({
            title: 'New Withdrawal Request',
            message: `A new withdrawal request of ${amount} has been submitted by ${withdrawalUserType} #${userId}`,
            type: 'withdrawal',
            userType: 'admin',
            priority: 2,
            link: `/admin/withdrawals/${withdrawal.withdrawalId}`
        });
        
        return res.status(201).json(
            messageHandler(
                'Withdrawal request submitted successfully',
                true,
                201,
                { withdrawal }
            )
        );
    } catch (error) {
        console.error('Create withdrawal error:', error);
        
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
            message: error.message || 'Failed to submit withdrawal request',
            statusCode: 500
        });
    }
};

/**
 * Get user withdrawals
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getUserWithdrawals = async (req, res) => {
    try {
        // Extract user info using the helper function
        let { userId, userType } = extractUserInfo(req);
        
        // Convert to proper case for Withdrawal schema (Member/Agent)
        const withdrawalUserType = userType === 'member' ? 'Member' : 'Agent';
        
        const { page = 1, limit = 10, status } = req.query;
        
        // Build where conditions
        const whereConditions = {
            userId,
            userType: withdrawalUserType
        };
        
        if (status) {
            whereConditions.status = status;
        }
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Get withdrawals
        const { count, rows } = await Withdrawal.findAndCountAll({
            where: whereConditions,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });
        
        return res.status(200).json(
            messageHandler(
                'Withdrawals retrieved successfully',
                true,
                200,
                {
                    withdrawals: rows,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: Math.ceil(count / parseInt(limit))
                    }
                }
            )
        );
    } catch (error) {
        console.error('Get user withdrawals error:', error);
        
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
            message: error.message || 'Failed to retrieve withdrawals',
            statusCode: 500
        });
    }
}; 