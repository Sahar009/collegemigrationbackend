import Wallet from '../schema/WalletSchema.js';
import WalletTransaction from '../schema/WalletTransactionSchema.js';
import Withdrawal from '../schema/WithdrawalSchema.js';
import { messageHandler } from '../utils/index.js';
import sequelize from '../database/db.js';

export const getWalletBalanceService = async (userId, userType) => {
    try {
        // Validate userType
        if (!userType) {
            return messageHandler(
                'User type is required',
                false,
                400
            );
        }

        const wallet = await Wallet.findOne({
            where: {
                userId: userId,
                userType: userType.toLowerCase()
            }
        });

        // If wallet doesn't exist, return zero balance
        if (!wallet) {
            return messageHandler(
                'Wallet balance retrieved successfully',
                true,
                200,
                { balance: 0.00 }
            );
        }

        return messageHandler(
            'Wallet balance retrieved successfully',
            true,
            200,
            wallet
        );

    } catch (error) {
        console.error('Get wallet balance error:', error);
        return messageHandler(
            error.message || 'Failed to get wallet balance',
            false,
            500
        );
    }
};

export const getWalletTransactionsService = async (userId, userType, query) => {
    try {
        // Validate userType
        if (!userType) {
            return messageHandler(
                'User type is required',
                false,
                400
            );
        }

        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;

        // Find wallet
        const wallet = await Wallet.findOne({
            where: {
                userId: userId,
                userType: userType.toLowerCase()
            }
        });

        // If wallet doesn't exist, return empty transactions
        if (!wallet) {
            return messageHandler(
                'No transactions found',
                true,
                200,
                {
                    transactions: [],
                    pagination: {
                        totalItems: 0,
                        totalPages: 0,
                        currentPage: page,
                        pageSize: limit
                    }
                }
            );
        }

        // Get transactions
        const { count, rows: transactions } = await WalletTransaction.findAndCountAll({
            where: { walletId: wallet.walletId },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        return messageHandler(
            'Transactions retrieved successfully',
            true,
            200,
            {
                transactions,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    pageSize: limit
                }
            }
        );

    } catch (error) {
        console.error('Get wallet transactions error:', error);
        return messageHandler(
            error.message || 'Failed to get transactions',
            false,
            500
        );
    }
};

export const createWithdrawalRequestService = async (withdrawalData) => {
    const t = await sequelize.transaction();
    
    try {
        const wallet = await Wallet.findOne({
            where: {
                userId: withdrawalData.userId,
                userType: withdrawalData.userType
            },
            transaction: t
        });

        if (!wallet || wallet.balance < withdrawalData.amount) {
            await t.rollback();
            return messageHandler(
                'Insufficient balance',
                false,
                400
            );
        }

        // Create withdrawal request
        const withdrawal = await Withdrawal.create(withdrawalData, { transaction: t });

        // Create withdrawal transaction
        await WalletTransaction.create({
            walletId: wallet.walletId,
            type: 'withdrawal',
            amount: withdrawalData.amount,
            status: 'Pending'
        }, { transaction: t });

        // Update wallet balance
        await wallet.update({
            balance: sequelize.literal(`balance - ${withdrawalData.amount}`)
        }, { transaction: t });

        await t.commit();

        return messageHandler(
            'Withdrawal request created successfully',
            true,
            201,
            withdrawal
        );

    } catch (error) {
        await t.rollback();
        console.error('Create withdrawal request error:', error);
        return messageHandler(
            error.message || 'Failed to create withdrawal request',
            false,
            500
        );
    }
}; 