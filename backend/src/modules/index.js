import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import seguridadRoutes from './seguridad/seguridad.routes.js';
import { cajasRoutes, turnosRoutes } from './caja/caja.routes.js';
import inventarioRoutes from './inventario/inventario.routes.js';
import dashboardRoutes from './dashboard/dashboard.routes.js';

// Cada módulo registra aquí su router bajo /api/<recurso-plural>
// Ejemplo (cuando exista): router.use('/insumos', insumosRoutes);
const router = Router();
router.use('/auth', authRoutes);
router.use('/seguridad', seguridadRoutes);
router.use('/cajas', cajasRoutes);
router.use('/turnos', turnosRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/dashboard', dashboardRoutes);


export default router;
