import Withdrawal from '../schema/WithdrawalSchema.js';
import Wallet from '../schema/WalletSchema.js';
import { messageHandler } from '../utils/index.js';
import { createNotification } from '../service/notificationService.js';
import { Op } from 'sequelize';

/**
 * Get user wallet balance
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getWalletBalance = async (req, res) => {
    try {
        let userId, userType;
        
        if (req.user.agentId) {
            userId = req.user.agentId;
            userType = 'Agent';
        } else if (req.user.memberId) {
            userId = req.user.memberId;
            userType = 'Member';
        } else {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user type',
                statusCode: 400
            });
        }
        
        // Get or create wallet
        let wallet = await Wallet.findOne({
            where: { userId, userType }
        });
        
        if (!wallet) {
            wallet = await Wallet.create({
                userId,
                userType,
                balance: 0.00,
                totalEarned: 0.00,
                totalWithdrawn: 0.00
            });
        }
        
        return res.status(200).json(
            messageHandler(
                'Wallet balance retrieved successfully',
                true,
                200,
                {
                    balance: parseFloat(wallet.balance),
                    totalEarned: parseFloat(wallet.totalEarned),
                    totalWithdrawn: parseFloat(wallet.totalWithdrawn),
                    currency: wallet.currency || 'USD'
                }
            )
        );
    } catch (error) {
        console.error('Get wallet balance error:', error);
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
        let userId, userType;
        
        if (req.user.agentId) {
            userId = req.user.agentId;
            userType = 'Agent';
        } else if (req.user.memberId) {
            userId = req.user.memberId;
            userType = 'Member';
        } else {
            return res.status(400).json({
                success: false,
                message: 'Only members and agents can request withdrawals',
                statusCode: 400
            });
        }
        
        const { accountName, accountNumber, bankName, amount } = req.body;
        
        // Validate required fields
        if (!accountName || !accountNumber || !bankName || !amount) {
            return res.status(400).json(
                messageHandler(
                    'All fields are required',
                    false,
                    400
                )
            );
        }
        
        // Get wallet
        const wallet = await Wallet.findOne({
            where: { userId, userType }
        });
        
        if (!wallet) {
            return res.status(404).json(
                messageHandler(
                    'Wallet not found',
                    false,
                    404
                )
            );
        }
        
        // Check if sufficient balance
        if (parseFloat(wallet.balance) < parseFloat(amount)) {
            return res.status(400).json(
                messageHandler(
                    'Insufficient balance',
                    false,
                    400
                )
            );
        }
        
        // Check if there's a pending withdrawal
        const pendingWithdrawal = await Withdrawal.findOne({
            where: {
                userId,
                userType,
                status: 'Pending'
            }
        });
        
        if (pendingWithdrawal) {
            return res.status(400).json(
                messageHandler(
                    'You already have a pending withdrawal request',
                    false,
                    400
                )
            );
        }
        
        // Create withdrawal request
        const withdrawal = await Withdrawal.create({
            userId,
            userType,
            accountName,
            accountNumber,
            bankName,
            amount,
            status: 'Pending',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Notify admin
        await createNotification({
            userId: 1, // Assuming admin ID is 1
            userType: 'admin',
            type: 'withdrawal',
            title: 'New Withdrawal Request',
            message: `A new withdrawal request of $${amount} has been submitted by a ${userType}.`,
            priority: 2
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
        let userId, userType;
        
        if (req.user.agentId) {
            userId = req.user.agentId;
            userType = 'Agent';
        } else if (req.user.memberId) {
            userId = req.user.memberId;
            userType = 'Member';
        } else {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user type',
                statusCode: 400
            });
        }
        
        const { page = 1, limit = 10, status } = req.query;
        
        // Build where conditions
        const whereConditions = {
            userId,
            userType
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
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve withdrawals',
            statusCode: 500
        });
    }
}; 