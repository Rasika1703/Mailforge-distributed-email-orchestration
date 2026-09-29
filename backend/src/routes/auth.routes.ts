import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.get('/google', authLimiter, asyncHandler(authController.startGoogleLogin));
router.get('/google/callback', authLimiter, asyncHandler(authController.googleCallback));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.post('/logout', asyncHandler(authController.logout));

export default router;
