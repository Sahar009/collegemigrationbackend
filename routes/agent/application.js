import express from 'express';
import { authenticateAgent } from '../../middleware/authMiddleware.js';
import { 
    getAllAgentApplications, 
    getAgentApplication,
    createAgentApplication,
    updateAgentApplication,
    deleteAgentApplication
} from '../../controllers/agentApplicationController.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const applicationRouter = express.Router();

// Apply authentication middleware to all routes
applicationRouter.use(authenticateAgent);

// Application routes
applicationRouter.get('/', asyncHandler(getAllAgentApplications));
applicationRouter.get('/:applicationId', asyncHandler(getAgentApplication));
applicationRouter.post('/', asyncHandler(createAgentApplication));
applicationRouter.put('/:applicationId', asyncHandler(updateAgentApplication));
applicationRouter.delete('/:applicationId', asyncHandler(deleteAgentApplication));

export default applicationRouter; 