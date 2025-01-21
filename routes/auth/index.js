import express from 'express';
import { getAllUsersController, loginController, registerController } from '../../controllers/authController.js';
import { checkSchema } from 'express-validator';
import { registerValidator } from '../../validations/user/index.js';


const authRouter = express.Router();

authRouter.post('/register', checkSchema(registerValidator), registerController);
authRouter.post('/login', loginController);
authRouter.get('/users', getAllUsersController);

export default authRouter;