import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Exige header "Authorization: Bearer <token>" y deja req.user = { id, rol }
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) return next(new AppError('Token requerido', 401));
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.id, rol: payload.rol, tipo: payload.tipo || 'admin' };
    next();
  } catch {
    next(new AppError('Token inválido o expirado', 401));
  }
}

export function requireTipo(tipo) {
  return (req, _res, next) => {
    if (req.user?.tipo !== tipo) return next(new AppError('Sesión no válida para este portal', 403));
    next();
  };
}
