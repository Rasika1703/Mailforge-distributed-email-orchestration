import { Router } from 'express';
import healthRoutes from './health.routes';
import emailsRoutes from './emails.routes';
import sendersRoutes from './senders.routes';
import queueRoutes from './queue.routes';
import authRoutes from './auth.routes';
import slackRoutes from './slack.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/emails', emailsRoutes);
router.use('/senders', sendersRoutes);
router.use('/queue', queueRoutes);
router.use('/auth', authRoutes);
router.use('/slack', slackRoutes);


export default router;
