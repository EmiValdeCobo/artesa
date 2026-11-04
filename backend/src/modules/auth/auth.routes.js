import { Router } from 'express';
import { authenticate, requireTipo } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { loginSchema } from './auth.schemas.js';
import * as controller from './auth.controller.js';

const router = Router();
router.post('/login', controller.loginLimiter, validate(loginSchema), asyncHandler(controller.login));
router.post('/cliente/login', controller.loginLimiter, validate(loginSchema), asyncHandler(controller.loginCliente));
router.post('/logout', authenticate, asyncHandler(controller.logout));
router.get('/me', authenticate, requireTipo('admin'), asyncHandler(controller.me));
router.get('/cliente/me', authenticate, requireTipo('cliente'), asyncHandler(controller.meCliente));
export default router;
