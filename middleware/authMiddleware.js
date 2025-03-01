import jwt from 'jsonwebtoken';
import { Agent } from '../schema/AgentSchema.js';
import { JWT_SECRET } from '../config/constants.js';

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

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if agent exists and is active
        const agent = await Agent.findOne({
            where: {
                agentId: decoded.id,
                status: 'active'
            },
            attributes: ['agentId', 'email', 'companyName', 'status']
        });

        if (!agent) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or inactive account'
            });
        }

        // Add agent info to request
        req.user = {
            id: agent.agentId,
            email: agent.email,
            companyName: agent.companyName,
            role: 'agent'
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
}; 