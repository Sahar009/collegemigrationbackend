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
                console.error('JWT verification error:', err);
                return res.status(UNAUTHORIZED).json(
                    messageHandler('Unauthorized - Token invalid or expired', false, UNAUTHORIZED)
                );
            }

            console.log('Decoded token:', decodedToken); // Debug log
            
            // Check if admin exists - make sure the ID field matches what's in your token
            const admin = await Admin.findByPk(decodedToken.id);
            
            console.log('Found admin:', admin ? 'Yes' : 'No'); // Debug log
            
            if (!admin) {
                return res.status(UNAUTHORIZED).json(
                    messageHandler('Admin not found with ID: ' + decodedToken.id, false, UNAUTHORIZED)
                );
            }
            
            if (admin.status !== 'active') {
                return res.status(UNAUTHORIZED).json(
                    messageHandler('Admin account is not active', false, UNAUTHORIZED)
                );
            }

            // Add admin info to both req.admin and req.user
            const adminInfo = {
                id: admin.adminId,
                email: admin.email,
                username: admin.username,
                role: admin.role
            };
            
            req.admin = adminInfo;
            req.user = adminInfo;

            next();
        });
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(UNAUTHORIZED).json(
            messageHandler('Server Error in authentication', false, UNAUTHORIZED)
        );
    }
};

// Middleware to check if admin has required role
export const requireRole = (roles) => {
    return (req, res, next) => {
        // Check both req.admin and req.user for compatibility
        const adminInfo = req.admin || req.user;
        
        if (!adminInfo) {
            return res.status(UNAUTHORIZED).json(
                messageHandler('Authentication required', false, UNAUTHORIZED)
            );
        }

        if (roles.includes(adminInfo.role)) {
            next();
        } else {
            return res.status(UNAUTHORIZED).json(
                messageHandler('Insufficient permissions', false, UNAUTHORIZED)
            );
        }
    };
};