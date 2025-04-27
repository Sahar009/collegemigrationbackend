import express from 'express';
import { 
    createExchangeRate,
    updateExchangeRate,
    getExchangeRates,
    getExchangeRateByCode,
    toggleExchangeRateStatus,
    deleteExchangeRate
} from '../../controllers/paymentConfigController.js';
import { authenticateAdmin } from '../../middleware/adminAuthMiddleware.js';

const exchangeRateRouter = express.Router();

// Public routes
exchangeRateRouter.get('/', getExchangeRates);
exchangeRateRouter.get('/:currency', getExchangeRateByCode);

// Admin routes
exchangeRateRouter.post('/', authenticateAdmin, createExchangeRate);
exchangeRateRouter.put('/:currency', authenticateAdmin, updateExchangeRate);
exchangeRateRouter.patch('/:currency/toggle', authenticateAdmin, toggleExchangeRateStatus);
exchangeRateRouter.delete('/:currency', authenticateAdmin, deleteExchangeRate);

export default exchangeRateRouter; 