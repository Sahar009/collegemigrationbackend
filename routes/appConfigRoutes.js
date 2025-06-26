import express from 'express';
import { isAdmin } from '../middleware/authMiddleware.js';
import { updateConfigs, getAllConfigs } from '../service/appConfigService.js';

const router = express.Router();

// Get all configurations (admin only)
router.get('/', isAdmin, (req, res) => {
    return getAllConfigs((response) => {
        res.status(response.status).json(response);
    });
});

// Update configurations (admin only)
router.put('/', isAdmin, (req, res) => {
    const configUpdates = req.body;
    
    if (!configUpdates || Object.keys(configUpdates).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No configuration updates provided'
        });
    }

    return updateConfigs(configUpdates, (response) => {
        res.status(response.status).json(response);
    });
});

export default router;
