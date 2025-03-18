import jwt from 'jsonwebtoken';
import { UNAUTHORIZED, NOT_FOUND } from '../constants/statusCode.js';
import { messageHandler } from '../utils/index.js';
import { Member } from '../schema/memberSchema.js';
import { Agent } from '../schema/AgentSchema.js';

export const authenticateUser = async (req, res, next) => {
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

      // Check if user exists in either Member or Agent table
      let user = await Member.findByPk(decodedToken.id);
      let userType = 'member';

      // If not found in Member table, check Agent table
      if (!user) {
        user = await Agent.findByPk(decodedToken.id);
        userType = 'agent';
      }

      if (!user) {
        return res.status(UNAUTHORIZED).json(
          messageHandler('User not found', false, UNAUTHORIZED)
        );
      }

      // Add user and type to request object
      req.user = {
        id: user.memberId || user.agentId,
        email: user.email,
        type: userType,
        firstname: user.firstname,
        lastname: user.lastname,
        status: user.memberStatus || user.agentStatus
      };

      next();
    });
  } catch (err) {
    return res.status(UNAUTHORIZED).json(
      messageHandler('Server Error', false, UNAUTHORIZED)
    );
  }
};

// Optional: Add middleware for agents only
export const agentOnly = (req, res, next) => {
  if (req.user && req.user.type === 'agent') {
    next();
  } else {
    return res.status(UNAUTHORIZED).json(
      messageHandler('Not authorized as an agent', false, UNAUTHORIZED)
    );
  }
};

// Optional: Add middleware for members only
export const memberOnly = (req, res, next) => {
  if (req.user && req.user.type === 'member') {
    next();
  } else {
    return res.status(UNAUTHORIZED).json(
      messageHandler('Not authorized as a member', false, UNAUTHORIZED)
    );
  }
};
