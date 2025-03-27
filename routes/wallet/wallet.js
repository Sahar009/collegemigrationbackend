import express from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
    getWalletBalance,
    getWalletTransactions,
    createWithdrawalRequest
} from '../../controllers/walletController.js';
import { authenticateUser } from '../../middlewares/auth-middleware.js';
import * as withdrawalController from '../../controllers/withdrawalController.js';

const walletRouter = express.Router();

walletRouter.use(authenticateUser);

walletRouter.get('/balance', asyncHandler(getWalletBalance));
walletRouter.get('/transactions', asyncHandler(getWalletTransactions));
walletRouter.post('/withdrawals', asyncHandler(createWithdrawalRequest));

// Add these routes
walletRouter.get('/wallet/balance', asyncHandler(withdrawalController.getWalletBalance));
walletRouter.get('/withdrawals', asyncHandler(withdrawalController.getUserWithdrawals));
walletRouter.post('/withdrawals', asyncHandler(withdrawalController.createWithdrawal));

export default walletRouter; 