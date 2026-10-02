import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  requestOtpSchema,
  resetPasswordSchema,
  updateLocationSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), ctrl.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), ctrl.login);
router.post('/refresh', validate({ body: refreshSchema }), ctrl.refresh);
router.post('/logout', ctrl.logout);

router.post('/otp/request', otpLimiter, validate({ body: requestOtpSchema }), ctrl.requestOtp);
router.post('/verify-phone', authLimiter, validate({ body: verifyOtpSchema }), ctrl.verifyPhone);

router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), ctrl.resetPassword);
router.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), ctrl.changePassword);

router.get('/me', requireAuth, ctrl.me);
router.put('/me', requireAuth, validate({ body: updateProfileSchema }), ctrl.updateMe);
router.put('/me/location', requireAuth, validate({ body: updateLocationSchema }), ctrl.updateLocation);

export default router;
