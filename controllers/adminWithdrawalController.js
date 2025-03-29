import Withdrawal from '../schema/WithdrawalSchema.js';
import Wallet from '../schema/WalletSchema.js';
import WalletTransaction from '../schema/WalletTransactionSchema.js';
import { messageHandler } from '../utils/index.js';
import sequelize from '../database/db.js';
import { Op } from 'sequelize';
import { createNotification } from '../service/notificationService.js';

/**
 * Get all withdrawal requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getAllWithdrawals = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            userType,
            startDate, 
            endDate,
            search
        } = req.query;
        
        // Build where conditions
        const whereConditions = {};
        
        if (status) {
            whereConditions.status = status;
        }
        
        if (userType) {
            whereConditions.userType = userType;
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
        
        // Add search filter if provided
        if (search) {
            whereConditions[Op.or] = [
                { accountName: { [Op.like]: `%${search}%` } },
                { accountNumber: { [Op.like]: `%${search}%` } },
                { bankName: { [Op.like]: `%${search}%` } }
            ];
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
        console.error('Get all withdrawals error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve withdrawals',
            statusCode: 500
        });
    }
};

/**
 * Get withdrawal by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getWithdrawalById = async (req, res) => {
    try {
        const { withdrawalId } = req.params;
        
        // Get withdrawal with user details
        const withdrawal = await Withdrawal.findByPk(withdrawalId);
        
        if (!withdrawal) {
            return res.status(404).json(
                messageHandler(
                    'Withdrawal not found',
                    false,
                    404
                )
            );
        }
        
        // Get user's wallet
        const wallet = await Wallet.findOne({
            where: {
                userId: withdrawal.userId,
                userType: withdrawal.userType.toLowerCase() // Convert to lowercase to match wallet schema
            }
        });
        
        // If wallet doesn't exist, create a response with zero balance
        const walletInfo = wallet ? {
            walletId: wallet.walletId,
            balance: parseFloat(wallet.balance),
            userType: wallet.userType,
            userId: wallet.userId
        } : {
            balance: 0,
            userType: withdrawal.userType.toLowerCase(),
            userId: withdrawal.userId
        };
        
        return res.status(200).json(
            messageHandler(
                'Withdrawal retrieved successfully',
                true,
                200,
                { 
                    withdrawal,
                    wallet: walletInfo
                }
            )
        );
    } catch (error) {
        console.error('Get withdrawal by ID error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve withdrawal',
            statusCode: 500
        });
    }
};

/**
 * Process withdrawal (approve/reject)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const processWithdrawal = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { withdrawalId } = req.params;
        const { status, rejectionReason, transactionReference } = req.body;
        
        // Validate status
        if (!status || !['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json(
                messageHandler(
                    'Invalid status. Must be either Approved or Rejected',
                    false,
                    400
                )
            );
        }
        
        // Get withdrawal
        const withdrawal = await Withdrawal.findByPk(withdrawalId, { transaction: t });
        
        if (!withdrawal) {
            await t.rollback();
            return res.status(404).json(
                messageHandler(
                    'Withdrawal not found',
                    false,
                    404
                )
            );
        }
        
        // Check if withdrawal is already processed
        if (withdrawal.status !== 'Pending') {
            await t.rollback();
            return res.status(400).json(
                messageHandler(
                    `Withdrawal has already been ${withdrawal.status.toLowerCase()}`,
                    false,
                    400
                )
            );
        }
        
        // If rejecting, require a reason
        if (status === 'Rejected' && !rejectionReason) {
            await t.rollback();
            return res.status(400).json(
                messageHandler(
                    'Rejection reason is required',
                    false,
                    400
                )
            );
        }
        
        // If approving, require a transaction reference
        if (status === 'Approved' && !transactionReference) {
            await t.rollback();
            return res.status(400).json(
                messageHandler(
                    'Transaction reference is required for approval',
                    false,
                    400
                )
            );
        }
        
        // Update withdrawal status
        await withdrawal.update({
            status,
            rejectionReason: rejectionReason || null,
            transactionReference: transactionReference || null,
            processedBy: req.user.adminId,
            updatedAt: new Date()
        }, { transaction: t });
        
        // If approved, debit the wallet
        if (status === 'Approved') {
            // Get user wallet - convert userType to lowercase for wallet lookup
            const wallet = await Wallet.findOne({
                where: {
                    userId: withdrawal.userId,
                    userType: withdrawal.userType.toLowerCase() // Convert to lowercase
                },
                transaction: t
            });
            
            if (!wallet) {
                await t.rollback();
                return res.status(404).json(
                    messageHandler(
                        'User wallet not found',
                        false,
                        404
                    )
                );
            }
            
            // Check if sufficient balance
            if (parseFloat(wallet.balance) < parseFloat(withdrawal.amount)) {
                await t.rollback();
                return res.status(400).json(
                    messageHandler(
                        'Insufficient wallet balance',
                        false,
                        400
                    )
                );
            }
            
            // Update wallet balance
            const newBalance = parseFloat(wallet.balance) - parseFloat(withdrawal.amount);
            
            // Check if totalWithdrawn field exists in wallet schema
            let updateData = {
                balance: newBalance,
                updatedAt: new Date()
            };
            
            // If totalWithdrawn field exists, update it
            if ('totalWithdrawn' in wallet.dataValues) {
                const newTotalWithdrawn = parseFloat(wallet.totalWithdrawn || 0) + parseFloat(withdrawal.amount);
                updateData.totalWithdrawn = newTotalWithdrawn;
            }
            
            await wallet.update(updateData, { transaction: t });
            
            // Create wallet transaction
            await WalletTransaction.create({
                walletId: wallet.walletId,
                type: 'withdrawal',
                amount: withdrawal.amount,
                status: 'Completed',
                createdAt: new Date(),
                updatedAt: new Date()
            }, { transaction: t });
        }
        
        // Create notification for user
        let notificationTitle, notificationMessage;
        
        if (status === 'Approved') {
            notificationTitle = 'Withdrawal Approved';
            notificationMessage = `Your withdrawal request of $${withdrawal.amount} has been approved and processed. Transaction reference: ${transactionReference}`;
        } else {
            notificationTitle = 'Withdrawal Rejected';
            notificationMessage = `Your withdrawal request of $${withdrawal.amount} has been rejected. Reason: ${rejectionReason}`;
        }
        
        await createNotification({
            userId: withdrawal.userId,
            userType: withdrawal.userType.toLowerCase(),
            type: 'withdrawal',
            title: notificationTitle,
            message: notificationMessage,
            priority: 1
        });
        
        await t.commit();
        
        return res.status(200).json(
            messageHandler(
                `Withdrawal ${status.toLowerCase()} successfully`,
                true,
                200,
                { withdrawal }
            )
        );
    } catch (error) {
        await t.rollback();
        console.error('Process withdrawal error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to process withdrawal',
            statusCode: 500
        });
    }
};

/**
 * Get withdrawal statistics
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response
 */
export const getWithdrawalStats = async (req, res) => {
    try {
        // Get total count of withdrawals
        const totalCount = await Withdrawal.count();
        
        // Get count by status
        const countByStatus = await Withdrawal.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('withdrawalId')), 'count']
            ],
            group: ['status']
        });
        
        // Get count by user type
        const countByUserType = await Withdrawal.findAll({
            attributes: [
                'userType',
                [sequelize.fn('COUNT', sequelize.col('withdrawalId')), 'count']
            ],
            group: ['userType']
        });
        
        // Get total amount by status
        const amountByStatus = await Withdrawal.findAll({
            attributes: [
                'status',
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: ['status']
        });
        
        // Get recent withdrawals (last 7 days)
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        
        const recentCount = await Withdrawal.count({
            where: {
                createdAt: {
                    [Op.gte]: last7Days
                }
            }
        });
        
        return res.status(200).json(
            messageHandler(
                'Withdrawal statistics retrieved successfully',
                true,
                200,
                {
                    totalCount,
                    countByStatus: countByStatus.map(item => ({
                        status: item.status,
                        count: parseInt(item.get('count'))
                    })),
                    countByUserType: countByUserType.map(item => ({
                        userType: item.userType,
                        count: parseInt(item.get('count'))
                    })),
                    amountByStatus: amountByStatus.map(item => ({
                        status: item.status,
                        total: parseFloat(item.get('total'))
                    })),
                    recentCount
                }
            )
        );
    } catch (error) {
        console.error('Get withdrawal stats error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve withdrawal statistics',
            statusCode: 500
        });
    }
}; 
