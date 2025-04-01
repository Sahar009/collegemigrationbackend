import cron from 'node-cron';
import axios from 'axios';
import { baseUrl } from '../config/utils.js';

// Function to ping the server
const pingServer = async () => {
    try {
        console.log('[Cron] Pinging server at:', new Date().toISOString());
        const response = await axios.get(`${baseUrl}/health`);
        console.log('[Cron] Server response:', {
            status: response.status,
            data: response.data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Cron] Server ping failed:', {
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Create health check endpoint
export const setupHealthCheck = (app) => {
    app.get('/api/v1/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });
};

// Initialize cron jobs
export const initCronJobs = () => {
    // Schedule ping every 15 minutes
    // '*/15 * * * *' means: at every 15th minute
    cron.schedule('*/15 * * * *', pingServer, {
        scheduled: true,
        timezone: "UTC"
    });

    console.log('[Cron] Server ping job initialized');
}; 