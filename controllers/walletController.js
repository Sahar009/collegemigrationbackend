import {
    getWalletBalanceService,
    getWalletTransactionsService,
    createWithdrawalRequestService
} from '../service/walletService.js';
import { messageHandler } from '../utils/index.js';

export const getWalletBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const userType = req.user.type;

        const result = await getWalletBalanceService(userId, userType);
        return res.status(result.statusCode).json(result);

    } catch (error) {
        console.error('Get wallet balance controller error:', error);
        return res.status(500).json(
            messageHandler(
                error.message || 'Failed to get wallet balance',
                false,
                500
            )
        );
    }
};

export const getWalletTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const userType = req.user.type;

        const result = await getWalletTransactionsService(userId, userType, req.query);
        return res.status(result.statusCode).json(result);

    } catch (error) {
        console.error('Get wallet transactions controller error:', error);
        return res.status(500).json(
            messageHandler(
                error.message || 'Failed to get transactions',
                false,
                500
            )
        );
    }
};

export const createWithdrawalRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const userType = req.user.type;
        const { accountName, accountNumber, amount, bankName } = req.body;

        if (!accountName || !accountNumber || !amount || !bankName) {
            return res.status(400).json(
                messageHandler(
                    'Account details and amount are required',
                    false,
                    400
                )
            );
        }

        const withdrawalData = {
            userId,
            userType,
            accountName,
            accountNumber,
            amount,
            bankName
        };

        const result = await createWithdrawalRequestService(withdrawalData);
        return res.status(result.statusCode).json(result);

    } catch (error) {
        console.error('Create withdrawal request controller error:', error);
        return res.status(500).json(
            messageHandler(
                error.message || 'Failed to create withdrawal request',
                false,
                500
            )
        );
    }
}; 