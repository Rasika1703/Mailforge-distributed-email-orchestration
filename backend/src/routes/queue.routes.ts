import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as queueController from '../controllers/queue.controller';

const router = Router();

router.get('/stats', requireAuth, asyncHandler(queueController.stats));

export default router;
