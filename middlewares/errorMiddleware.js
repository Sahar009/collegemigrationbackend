import { INTERNAL_SERVER_ERROR } from '../constants/statusCode.js';
import { messageHandler } from '../utils/index.js';

export const errorMiddleware = (err, req, res, next) => {

  console.error(err);


  const statusCode = err.statusCode || INTERNAL_SERVER_ERROR;

 
  const responseMessage = err.message || 'An unexpected error occurred';

  return res.status(statusCode).json(
    messageHandler(responseMessage, false, statusCode)
  );
};

export default errorMiddleware;