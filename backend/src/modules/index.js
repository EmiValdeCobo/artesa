import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';

// Cada módulo registra aquí su router bajo /api/<recurso-plural>
// Ejemplo (cuando exista): router.use('/insumos', insumosRoutes);
const router = Router();
router.use('/auth', authRoutes);

export default router;
