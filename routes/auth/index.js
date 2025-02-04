import express from 'express';
import { getAllUsersController, googleAuthController, getUserProfileController, loginController, registerController } from '../../controllers/authController.js';
import { checkSchema } from 'express-validator';
import { registerValidator } from '../../validations/user/index.js';


const authRouter = express.Router();

authRouter.post('/register', checkSchema(registerValidator), registerController);
authRouter.post('/login', loginController);
authRouter.get('/users', getAllUsersController);
authRouter.post('/google', googleAuthController);
authRouter.get('/profile/:id', getUserProfileController);

export default authRouter;