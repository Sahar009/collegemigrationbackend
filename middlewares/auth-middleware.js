import jwt from 'jsonwebtoken';
import { UNAUTHORIZED, NOT_FOUND } from '../constants/statusCode.js';
import { messageHandler } from '../utils/index.js';

export  const authenticateUser = (req, res, next) => {
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

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        return res.status(UNAUTHORIZED).json(
          messageHandler('Unauthorized', false, UNAUTHORIZED)
        );
      }

      req.user = decodedToken; 
      next();
    });
  } catch (err) {
    return res.status(UNAUTHORIZED).json(
      messageHandler('Server Error', false, UNAUTHORIZED)
    );
  }
};
