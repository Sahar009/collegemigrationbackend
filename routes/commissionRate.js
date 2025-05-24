import express from 'express';
import { getRates, updateRate } from '../controllers/commissionRateController.js';

const router = express.Router();

router.route('/')
    .get(getRates);

router.route('/:userType')
    .put(updateRate);

export default router;