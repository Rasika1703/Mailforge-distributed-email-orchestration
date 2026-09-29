import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';
import * as slackController from '../controllers/slack.controller';

const router = Router();

router.get('/connect', authLimiter, asyncHandler(slackController.connect));
router.get('/callback', authLimiter, asyncHandler(slackController.callback));
router.get('/status', requireAuth, asyncHandler(slackController.status));
router.post('/disconnect', requireAuth, asyncHandler(slackController.disconnect));

export default router;
