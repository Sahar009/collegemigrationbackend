import authRouter from './auth/index.js'
import programRouter from './program/index.js';


const router = (app) => {
    const API_PREFIX = '/api/v1';
    app.use(`${API_PREFIX}/auth`, authRouter);
    app.use(`${API_PREFIX}/program`, programRouter);

};

export default router;