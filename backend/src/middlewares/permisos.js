import { query } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

// Uso: router.post('/ventas', authenticate, requirePermiso('POS_COBRAR'), ...)
// Con varios códigos basta tener UNO de ellos.
export const requirePermiso = (...codigos) => async (req, _res, next) => {
  try {
    for (const codigo of codigos) {
      const { rows } = await query('SELECT seguridad.fn_tiene_permiso($1, $2) AS ok', [req.user.id, codigo]);
      if (rows[0].ok) return next();
    }
    next(new AppError('No tienes permiso para esta acción', 403));
  } catch (error) {
    next(error);
  }
};
