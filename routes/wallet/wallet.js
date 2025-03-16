import express from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
    getWalletBalance,
    getWalletTransactions,
    createWithdrawalRequest
} from '../../controllers/walletController.js';
import { authenticateUser } from '../../middlewares/auth-middleware.js';

const walletRouter = express.Router();

walletRouter.use(authenticateUser);

walletRouter.get('/balance', asyncHandler(getWalletBalance));
walletRouter.get('/transactions', asyncHandler(getWalletTransactions));
walletRouter.post('/withdrawals', asyncHandler(createWithdrawalRequest));

export default walletRouter; 