import { Router } from 'express';
import { authenticate, requireTipo } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './bitacora.controller.js';

const router = Router();
router.use(authenticate, requireTipo('admin'), requirePermiso('SEG_VER_BITACORA'));
router.get('/metricas', asyncHandler(controller.metricas));
router.get('/', asyncHandler(controller.listar));
export default router;
