import express from 'express';
import { initiatePayment, verifyPayment } from '../../controllers/agentPaymentController.js';
import { authenticateAgent } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Protected payment routes
router.post('/initiate', authenticateAgent, initiatePayment);
router.get('/verify/:reference', authenticateAgent, verifyPayment);

export default router; 