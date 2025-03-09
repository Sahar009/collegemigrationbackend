import jwt from 'jsonwebtoken';
import { Agent } from '../schema/AgentSchema.js';
import { messageHandler } from '../utils/index.js';

export const authenticateAgent = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json(
                messageHandler('Authentication required', false, 401)
            );
        }

        // Get token
        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Set agent info in both places to ensure compatibility
        req.user = decoded;
        req.agent = decoded;
        
        // Log authentication details
        console.log('Authentication successful:', {
            agentId: decoded.id,
            token: token
        });

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
        return res.status(401).json(
            messageHandler('Invalid or expired token', false, 401)
        );
    }
}; 