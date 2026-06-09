import { Router } from 'express';
import { loginSchema, registerSchema, checkUsernameSchema, mfaVerifySchema } from '@say-it/shared';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { rateLimiter } from '../../middleware/rateLimiter.js';
import { z } from 'zod';

export const authRoutes = Router();

authRoutes.post('/login', rateLimiter('login', 5, 60), validate({ body: loginSchema }), authController.login);
authRoutes.post('/register', rateLimiter('register', 3, 60), validate({ body: registerSchema }), authController.register);
authRoutes.get('/check-username', validate({ query: checkUsernameSchema }), authController.checkUsername);
authRoutes.post('/mfa/verify', validate({ body: mfaVerifySchema }), authController.verifyMfa);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authenticate, authController.logout);
authRoutes.get('/sessions', authenticate, authController.sessions);
authRoutes.delete('/sessions/:id', authenticate, authController.revokeSession);
authRoutes.post('/mfa/setup', authenticate, authController.mfaSetup);
authRoutes.post('/mfa/enable', authenticate, validate({ body: z.object({ totpCode: z.string().length(6) }) }), authController.mfaEnable);
authRoutes.post('/mfa/disable', authenticate, authController.mfaDisable);
