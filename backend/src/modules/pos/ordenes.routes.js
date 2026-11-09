import { Router } from 'express';
import { authenticate, requireTipo } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './ordenes.controller.js';
import { crearOrdenSchema, editarOrdenSchema, cambiarEstadoOrdenSchema } from './ordenes.schemas.js';

// /api/pos/ordenes
const router = Router();

// Toda ruta exige sesión admin
router.use(authenticate, requireTipo('admin'));

// POST   /api/pos/ordenes            → crear comanda
router.post(
  '/',
  requirePermiso('POS_CREAR_ORDEN'),
  validate(crearOrdenSchema),
  asyncHandler(controller.crear),
);

// GET    /api/pos/ordenes            → listar activas (filtros: ?id_turno=&estado=)
router.get(
  '/',
  requirePermiso('POS_CREAR_ORDEN'),
  asyncHandler(controller.listar),
);

// GET    /api/pos/ordenes/:id        → detalle completo con items
router.get(
  '/:id',
  requirePermiso('POS_CREAR_ORDEN'),
  asyncHandler(controller.detalle),
);

// PUT    /api/pos/ordenes/:id        → editar (solo si estado = ABIERTA)
router.put(
  '/:id',
  requirePermiso('POS_CREAR_ORDEN'),
  validate(editarOrdenSchema),
  asyncHandler(controller.editar),
);

// PATCH  /api/pos/ordenes/:id/estado → avanzar/anular estado
router.patch(
  '/:id/estado',
  requirePermiso('POS_VER_COLA_PREPARACION'),
  validate(cambiarEstadoOrdenSchema),
  asyncHandler(controller.cambiarEstado),
);

export default router;

