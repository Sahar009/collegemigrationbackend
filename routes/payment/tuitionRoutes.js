import express from 'express';
import { 
    initiateTuitionPaymentController,
    getTuitionPaymentsController,
    verifyTuitionPaymentController,
    getSingleTuitionPaymentController
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

// Agent routes
tuitionRouter.post('/agent/initiate',
    authenticateUser,
    initiateTuitionPaymentController
);

tuitionRouter.get('/agent/verify',
    authenticateUser,
    verifyTuitionPaymentController
);

tuitionRouter.get('/:paymentId', 
    authenticateAdmin,
    getSingleTuitionPaymentController
);
// Admin routes
tuitionRouter.get('/', 
    authenticateAdmin,
    getTuitionPaymentsController
);

export default tuitionRouter;