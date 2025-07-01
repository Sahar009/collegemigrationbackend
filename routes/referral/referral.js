import express from 'express';
import { authenticateUser } from '../../middlewares/auth-middleware.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
    createReferral,
    getReferrals,
    getReferralsAgent,
    updateReferralStatus
} from '../../controllers/referralController.js';

const referralRouter = express.Router();

referralRouter.use(authenticateUser);

referralRouter.post('/', asyncHandler(createReferral));
referralRouter.get('/', asyncHandler(getReferrals));
referralRouter.get('/agent', asyncHandler(getReferralsAgent));
referralRouter.patch('/:referralId/status', asyncHandler(updateReferralStatus));

export default referralRouter; 