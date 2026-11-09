import { query } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

// Uso: router.post('/ventas', authenticate, requirePermiso('POS_COBRAR'), ...)
// Con varios códigos basta tener UNO de ellos.
export const requirePermiso = (...codigos) => async (req, _res, next) => {
  try {
    const rows = await query(
      `SELECT p.codigo
       FROM seguridad.usuarios u
       JOIN seguridad.roles_permisos rp ON rp.id_rol = u.id_rol
       JOIN seguridad.permisos p ON p.id_permiso = rp.id_permiso
       JOIN seguridad.roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1::uuid
         AND u.activo
         AND u.deleted_at IS NULL
         AND r.activo
         AND r.deleted_at IS NULL
         AND p.codigo = ANY($2::text[])`,
      [req.user.id, codigos],
    );
    if (rows.length > 0) return next();
    next(new AppError('No tienes permiso para esta acción', 403));
  } catch (error) {
    next(error);
  }
};
