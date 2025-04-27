import express from 'express';
import { 
    initiatePaymentController, 
    verifyPaymentController,
    handleWebhookController
} from '../../controllers/paymentController.js';
import {
    updateExchangeRate,
    getExchangeRates
} from '../../controllers/paymentConfigController.js';
import { authenticateUser} from '../../middlewares/auth-middleware.js';
import tuitionRouter from './tuitionRoutes.js';
import { authenticateAdmin } from '../../middleware/adminAuthMiddleware.js';
import exchangeRateRouter from './exchangeRateRoutes.js';

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



paymentRouter.get('/exchange-rates',
    authenticateAdmin,
    getExchangeRates
);

paymentRouter.put('/exchange-rate',
    authenticateAdmin,
    updateExchangeRate
);

// Exchange rate routes
paymentRouter.use('/exchange-rates', exchangeRateRouter);

// Tuition payment routes
paymentRouter.use('/tuition', tuitionRouter);

// Webhook endpoints (no auth required as it's called by payment providers)
paymentRouter.post('/webhook/:provider', handleWebhookController);

export default paymentRouter; 