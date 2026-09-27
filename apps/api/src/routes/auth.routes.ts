import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.get('/google', AuthController.googleLogin);
authRouter.get('/google/callback', AuthController.googleCallback);
authRouter.post('/dev-login', AuthController.devLogin);
authRouter.get('/me', authenticate, AuthController.getMe);
authRouter.post('/logout', AuthController.logout);
