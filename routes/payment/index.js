import express from 'express';
import { 
    initiatePaymentController, 
    verifyPaymentController,
    handleWebhookController
} from '../../controllers/paymentController.js';
import { authenticateUser } from '../../middlewares/auth-middleware.js';

const paymentRouter = express.Router();

// Initialize payment
paymentRouter.post('/initiate', 
    authenticateUser, 
    initiatePaymentController
);

// Verify payment
paymentRouter.get('/verify/:provider/:reference', 
    authenticateUser, 
    verifyPaymentController
);

// Webhook endpoints (no auth required as it's called by payment providers)
paymentRouter.post('/webhook/:provider', handleWebhookController);

export default paymentRouter; 