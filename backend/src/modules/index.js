import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import seguridadRoutes from './seguridad/seguridad.routes.js';
import { cajasRoutes, turnosRoutes } from './caja/caja.routes.js';

// Cada módulo registra aquí su router bajo /api/<recurso-plural>
// Ejemplo (cuando exista): router.use('/insumos', insumosRoutes);
const router = Router();
router.use('/auth', authRoutes);
router.use('/seguridad', seguridadRoutes);
router.use('/cajas', cajasRoutes);
router.use('/turnos', turnosRoutes);

export default router;
