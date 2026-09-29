import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { scheduleLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';
import * as emailsController from '../controllers/emails.controller';

const router = Router();

router.use(requireAuth);

router.post('/schedule', scheduleLimiter, asyncHandler(emailsController.schedule));
router.get('/scheduled', asyncHandler(emailsController.listScheduled));
router.get('/sent', asyncHandler(emailsController.listSent));
router.get('/search', asyncHandler(emailsController.searchEmails));
router.get('/:id', asyncHandler(emailsController.getById));

export default router;
