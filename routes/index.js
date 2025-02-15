import applicationRouter from './application/index.js';
import authRouter from './auth/index.js'
import onboardingRouter from './onboarding/onboardingRoutes.js';
import programRouter from './program/index.js';


const router = (app) => {
    const API_PREFIX = '/api/v1';
    app.use(`${API_PREFIX}/auth`, authRouter);
    app.use(`${API_PREFIX}/program`, programRouter);
    app.use(`${API_PREFIX}/onboarding`, onboardingRouter);
    app.use(`${API_PREFIX}/application`, applicationRouter);
};

export default router;