import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './seguridad.controller.js';
import { actualizarUsuarioSchema, crearUsuarioSchema } from './seguridad.schemas.js';

const router = Router();
router.use(authenticate);
router.get('/usuarios', requirePermiso('SEG_GESTIONAR_USUARIOS'), asyncHandler(controller.listarUsuarios));
router.get('/roles', requirePermiso('SEG_GESTIONAR_USUARIOS'), asyncHandler(controller.listarRoles));
router.get('/sucursales', requirePermiso('SEG_GESTIONAR_USUARIOS'), asyncHandler(controller.listarSucursales));
router.post('/usuarios', requirePermiso('SEG_GESTIONAR_USUARIOS'), validate(crearUsuarioSchema), asyncHandler(controller.crearUsuario));
router.put('/usuarios/:id', requirePermiso('SEG_GESTIONAR_USUARIOS'), validate(actualizarUsuarioSchema), asyncHandler(controller.actualizarUsuario));
router.delete('/usuarios/:id', requirePermiso('SEG_GESTIONAR_USUARIOS'), asyncHandler(controller.desactivarUsuario));

export default router;

