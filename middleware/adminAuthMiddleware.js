import jwt from 'jsonwebtoken';
import { UNAUTHORIZED, NOT_FOUND } from '../constants/statusCode.js';
import { messageHandler } from '../utils/index.js';
import Admin from '../schema/AdminSchema.js';

export const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(NOT_FOUND).json(
                messageHandler('Authorization header not found!', false, NOT_FOUND)
            );
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(NOT_FOUND).json(
                messageHandler('Token not found!', false, NOT_FOUND)
            );
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
            if (err) {
                return res.status(UNAUTHORIZED).json(
                    messageHandler('Unauthorized', false, UNAUTHORIZED)
                );
            }

            // Check if admin exists
            const admin = await Admin.findByPk(decodedToken.id);
            
            if (!admin || admin.status !== 'active') {
                return res.status(UNAUTHORIZED).json(
                    messageHandler('Admin not found or inactive', false, UNAUTHORIZED)
                );
            }

            // Add admin to request object
            req.admin = {
                id: admin.adminId,
                email: admin.email,
                username: admin.username,
                role: admin.role
            };

            next();
        });
    } catch (err) {
        return res.status(UNAUTHORIZED).json(
            messageHandler('Server Error', false, UNAUTHORIZED)
        );
    }
};

// Middleware to check if admin has required role
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(UNAUTHORIZED).json(
                messageHandler('Authentication required', false, UNAUTHORIZED)
            );
        }

        if (roles.includes(req.admin.role)) {
            next();
        } else {
            return res.status(UNAUTHORIZED).json(
                messageHandler('Insufficient permissions', false, UNAUTHORIZED)
            );
        }
    };
}; 