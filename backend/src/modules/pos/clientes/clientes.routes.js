import { Router } from 'express';
import { authenticate, requireTipo } from '../../../middlewares/auth.js';
import { requirePermiso } from '../../../middlewares/permisos.js';
import { validate } from '../../../middlewares/validate.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as controller from './clientes.controller.js';
import { clienteSchema } from './clientes.schemas.js';

// /api/pos/clientes
const router = Router();

router.use(authenticate, requireTipo('admin'));

router.get('/', requirePermiso('POS_GESTIONAR_CLIENTES'), asyncHandler(controller.listar));
router.get('/:id', requirePermiso('POS_GESTIONAR_CLIENTES'), asyncHandler(controller.detalle));
router.post('/', requirePermiso('POS_GESTIONAR_CLIENTES'), validate(clienteSchema), asyncHandler(controller.crear));
router.put('/:id', requirePermiso('POS_GESTIONAR_CLIENTES'), validate(clienteSchema), asyncHandler(controller.actualizar));
router.delete('/:id', requirePermiso('POS_GESTIONAR_CLIENTES'), asyncHandler(controller.eliminar));

export default router;