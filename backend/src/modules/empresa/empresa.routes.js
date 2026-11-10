import { Router } from 'express';
import { authenticate, requireTipo } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as c from './empresa.controller.js';
import { parametroSchema, sucursalSchema } from './empresa.schemas.js';

const router = Router();
router.use(authenticate, requireTipo('admin'));
router.get('/sucursales', requirePermiso('EMP_GESTIONAR_SUCURSALES'), asyncHandler(c.listarSucursales));
router.post('/sucursales', requirePermiso('EMP_GESTIONAR_SUCURSALES'), validate(sucursalSchema), asyncHandler(c.crearSucursal));
router.put('/sucursales/:id', requirePermiso('EMP_GESTIONAR_SUCURSALES'), validate(sucursalSchema), asyncHandler(c.actualizarSucursal));
router.patch('/sucursales/:id/estado', requirePermiso('EMP_GESTIONAR_SUCURSALES'), asyncHandler(c.cambiarEstadoSucursal));
router.get('/parametros', requirePermiso('EMP_EDITAR_PARAMETROS'), asyncHandler(c.listarParametros));
router.put('/parametros', requirePermiso('EMP_EDITAR_PARAMETROS'), validate(parametroSchema), asyncHandler(c.actualizarParametro));
export default router;
