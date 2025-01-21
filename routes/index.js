import authRouter from './auth/index.js'


const router = (app) => {
    const API_PREFIX = '/api/v1';
    app.use(`${API_PREFIX}/auth`, authRouter);

};

export default router;