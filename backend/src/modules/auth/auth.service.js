import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './auth.repository.js';

async function armarSesion(usuario) {
  const [permisos, sucursales] = await Promise.all([repo.listarPermisos(usuario.id_usuario), repo.listarSucursales(usuario.id_usuario)]);
  return {
    usuario: { id: usuario.id_usuario, username: usuario.username, rol: usuario.rol, sucursales },
    permisos,
  };
}

export async function login(username, password) {
  const usuario = await repo.buscarUsuarioPorUsername(username);
  // Mismo mensaje si no existe o la clave es incorrecta (no revelar cuál falló)
  const valido = usuario && usuario.activo && (await bcrypt.compare(password, usuario.password_hash));
  if (!valido) throw new AppError('Usuario o contraseña incorrectos', 401);

  await repo.registrarLogin(usuario.id_usuario);
  const token = jwt.sign({ id: usuario.id_usuario, rol: usuario.rol }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  return { token, ...(await armarSesion(usuario)) };
}

export async function perfil(idUsuario) {
  const usuario = await repo.buscarUsuarioPorId(idUsuario);
  if (!usuario) throw new AppError('Usuario no encontrado o inactivo', 401);
  return armarSesion(usuario);
}
