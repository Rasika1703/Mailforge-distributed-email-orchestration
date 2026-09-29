import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as sendersController from '../controllers/senders.controller';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(sendersController.list));
router.post('/', asyncHandler(sendersController.create));
router.post('/ethereal', asyncHandler(sendersController.createEthereal));

export default router;
