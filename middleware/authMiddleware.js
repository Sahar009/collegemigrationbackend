import jwt from 'jsonwebtoken';
import { Agent } from '../schema/AgentSchema.js';

export const authenticateAgent = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Verify token
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get agent from database
        const agent = await Agent.findOne({
            where: {
                agentId: decoded.id,
                status: 'active'
            }
        });

        if (!agent) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Add agent info to request
        req.user = {
            agentId: agent.agentId,
            email: agent.email,
            status: agent.status
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
}; 