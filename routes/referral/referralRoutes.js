import express from 'express';
import { 
    registerMemberWithReferralController, 
    getReferralsController 
} from '../../controllers/referralController.js';
import { authenticateUser } from '../../middlewares/auth-middleware.js';

const Referralrouter = express.Router();

// Public route for registration with referral
Referralrouter.post('/register', registerMemberWithReferralController);

// Protected routes - require authentication
Referralrouter.get('/list/:refId', authenticateUser, getReferralsController);
Referralrouter.get('/list/:refId/:status', authenticateUser, getReferralsController);

export default Referralrouter; 