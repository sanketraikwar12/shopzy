import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { dbHealth } from '../config/db';
import authRoutes from './auth.routes';
import shopRoutes from './shop.routes';
import reviewRoutes from './review.routes';
import categoryRoutes from './category.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import aiRoutes from './ai.routes';
import { ok } from '../utils/response';

const router = Router();

/** Liveness — is the process up? Used by the Kubernetes livenessProbe. */
router.get('/health', (_req, res) => {
  ok(res, { status: 'ok', uptime: Math.round(process.uptime()), version: '1.0.0', env: env.NODE_ENV });
});

/** Readiness — can we serve traffic? Used by the readinessProbe and the LB. */
router.get('/ready', (_req, res) => {
  const db = dbHealth();
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ success: ready, data: { database: db, ready } });
});

router.use('/auth', authRoutes);
router.use('/shops', shopRoutes);
router.use('/reviews', reviewRoutes);
router.use('/categories', categoryRoutes);
router.use('/me', userRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);

export default router;
