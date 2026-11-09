import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { Cliente, Rol, Usuario } from '../models/index.js';

// Exige cookie httpOnly (o Bearer para clientes externos) y revalida estado en BD.
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');
  const tokenSesion = req.cookies?.artesa_session || (tipo === 'Bearer' ? token : null);
  if (!tokenSesion) return next(new AppError('Token requerido', 401));
  try {
    const payload = jwt.verify(tokenSesion, env.jwtSecret);
    if (!payload.id || !payload.tipo || !['admin', 'cliente'].includes(payload.tipo)) {
      throw new Error('Token sin tipo de sesión');
    }
    const modelo = payload.tipo === 'admin' ? Usuario : Cliente;
    const id = payload.tipo === 'admin' ? payload.id : Number(payload.id);
    const usuario = payload.tipo === 'admin'
      ? await Usuario.findOne({
        where: { id_usuario: id, activo: true },
        include: [{ model: Rol, as: 'rol', attributes: ['id_rol'], where: { activo: true }, required: true }],
      })
      : await modelo.findOne({ where: { id_cliente: id, activo: true } });
    if (!usuario) return next(new AppError('Sesión inactiva', 401));
    req.user = { id, rol: payload.rol, tipo: payload.tipo, jti: payload.jti };
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
