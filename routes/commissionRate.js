import express from 'express';
import { getRates, updateRate } from '../controllers/commissionRateController.js';
import { authenticateAdmin } from '../middleware/adminAuthMiddleware.js';

const commisionRouter = express.Router();

commisionRouter.use(authenticateAdmin);

commisionRouter.get('/',getRates);

commisionRouter.put('/:userType',updateRate);

export default commisionRouter;