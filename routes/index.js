import express from 'express';
import applicationRouter from './application/index.js';
import authRouter from './auth/index.js'
import onboardingRouter from './onboarding/onboardingRoutes.js';
import programRouter from './program/index.js';
import paymentRouter from './payment/index.js';
import agentRouter from './agent/index.js';
import walletRouter from './wallet/wallet.js';
import referralRouter from './referral/referral.js';
import adminRouter from './admin/index.js';
import messageRouter from './message/index.js';
import adminGroupRouter from './adminMessage/adminGroupRoutes.js';
import adminMessageRouter from './adminMessage/index.js';
import commisionRouter from './commissionRate.js';
import tuitionRouter from './payment/tuitionRoutes.js';
import { sendEmail } from '../utils/sendEmail.js';

const router = (app) => {
    const API_PREFIX = '/api/v1';
    app.use(`${API_PREFIX}/auth`, authRouter);
    app.use(`${API_PREFIX}/program`, programRouter);
    app.use(`${API_PREFIX}/onboarding`, onboardingRouter);
    app.use(`${API_PREFIX}/application`, applicationRouter);
    app.use(`${API_PREFIX}/payments`, paymentRouter);
    app.use(`${API_PREFIX}/agent`, agentRouter);
    app.use(`${API_PREFIX}/wallet`, walletRouter);
    app.use(`${API_PREFIX}/referral`, referralRouter);
    app.use(`${API_PREFIX}/admin`, adminRouter);
    app.use(`${API_PREFIX}/message`, messageRouter);
    app.use(`${API_PREFIX}/adminMessage`, adminGroupRouter);
    app.use(`${API_PREFIX}/adminMessage`, adminMessageRouter);
    app.use(`${API_PREFIX}/commission-rates`, commisionRouter);

    // Test email route
    app.get(`${API_PREFIX}/test-email`, async (req, res) => {
        try {
            const result = await sendEmail({
                to: "sehindeshoes@gmail.com",
                subject: 'Test Email from College Migration',
                template: 'test', // You should have a test.html or test.ejs template
                context: { name: 'Test User' }
            });
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

export default router;