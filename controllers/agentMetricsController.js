import * as agentMetricsService from '../service/agentMetricsService.js';

export const getAgentMetrics = async (req, res) => {
    try {
        const agentId = req.user.agentId;
        const metrics = await agentMetricsService.getAgentMetrics(agentId);
        
        return res.status(200).json({
            success: true,
            data: metrics
        });
    } catch (error) {
        console.error('Error in agent metrics controller:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
}; 