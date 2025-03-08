import { pingRedis } from '../utils/upstashCache.js';

export const checkHealth = async (req, res) => {
    try {
        // Check Redis connection
        const redisConnected = await pingRedis();
        
        return res.status(200).json({
            status: 'success',
            message: 'Service is healthy',
            redis: redisConnected ? 'connected' : 'disconnected'
        });
    } catch (error) {
        console.error('Health check error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Service health check failed',
            error: error.message
        });
    }
}; 