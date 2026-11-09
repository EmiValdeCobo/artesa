import { Router } from 'express';
import { authenticate, requireTipo } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './caja.controller.js';
import { abrirTurnoSchema, cerrarTurnoSchema, crearMovimientoSchema } from './caja.schemas.js';

// /api/cajas — cajas de las sucursales del usuario (para elegir en la apertura)
export const cajasRoutes = Router();
cajasRoutes.use(authenticate, requireTipo('admin'));
cajasRoutes.get('/', requirePermiso('CAJA_ABRIR_TURNO'), asyncHandler(controller.listarCajas));

// /api/turnos — apertura de turno y sus movimientos de caja
export const turnosRoutes = Router();
turnosRoutes.use(authenticate, requireTipo('admin'));
turnosRoutes.get('/actual', requirePermiso('CAJA_ABRIR_TURNO', 'CAJA_MOVIMIENTOS'), asyncHandler(controller.turnoActual));
turnosRoutes.get('/cuadres', requirePermiso('CAJA_VER_CUADRES'), asyncHandler(controller.listarCuadres));
turnosRoutes.post('/', requirePermiso('CAJA_ABRIR_TURNO'), validate(abrirTurnoSchema), asyncHandler(controller.abrirTurno));
turnosRoutes.get('/:idTurno/movimientos', requirePermiso('CAJA_MOVIMIENTOS', 'CAJA_VER_CUADRES'), asyncHandler(controller.listarMovimientos));
turnosRoutes.post('/:idTurno/movimientos', requirePermiso('CAJA_MOVIMIENTOS'), validate(crearMovimientoSchema), asyncHandler(controller.registrarMovimiento));
turnosRoutes.post('/:idTurno/cierre', requirePermiso('CAJA_CERRAR_TURNO'), validate(cerrarTurnoSchema), asyncHandler(controller.cerrarTurno));
turnosRoutes.get('/:idTurno/cuadre', requirePermiso('CAJA_CERRAR_TURNO', 'CAJA_VER_CUADRES'), asyncHandler(controller.obtenerCuadre));
