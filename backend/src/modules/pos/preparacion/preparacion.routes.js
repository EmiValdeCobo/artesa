import { Router } from 'express';
import { authenticate, requireTipo } from '../../../middlewares/auth.js';
import { requirePermiso } from '../../../middlewares/permisos.js';
import { validate } from '../../../middlewares/validate.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as controller from './preparacion.controller.js';
import { cambiarEstadoSchema } from './preparacion.schemas.js';

// /api/preparacion — pantalla de barra/cocina (KDS)
const router = Router();
router.use(authenticate, requireTipo('admin'), requirePermiso('POS_VER_COLA_PREPARACION'));
router.get('/cola', asyncHandler(controller.listarCola));
router.patch('/ordenes/:idOrden/estado', validate(cambiarEstadoSchema), asyncHandler(controller.cambiarEstado));

export default router;
