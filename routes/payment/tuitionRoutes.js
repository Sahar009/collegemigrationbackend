import express from 'express';
import { 
    initiateTuitionPaymentController,
    getTuitionPaymentsController,
    verifyTuitionPaymentController
} from '../../controllers/tuitionPaymentController.js';
import { authenticateUser } from '../../middlewares/auth-middleware.js';
import { authenticateAdmin } from '../../middleware/adminAuthMiddleware.js';

const tuitionRouter = express.Router();

// Student routes
tuitionRouter.post('/initiate', 
    authenticateUser, 
    initiateTuitionPaymentController
);

tuitionRouter.get('/verify', 
    authenticateUser, 
    verifyTuitionPaymentController
);

// Admin routes
tuitionRouter.get('/', 
    authenticateAdmin,
    getTuitionPaymentsController
);

export default tuitionRouter; 