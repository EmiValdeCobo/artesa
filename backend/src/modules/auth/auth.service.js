import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './auth.repository.js';
import crypto from 'node:crypto';

// Hash bcrypt precalculado (costo 10) para mitigar timing attacks si el usuario no existe
const DUMMY_HASH = '$2b$10$y4Pkw8PGAmBC6q/6aehq3eTg0b9qvWp4EeuB.Wznv6Mkt1tfdDpbq';

// Blacklist en memoria para revocación instantánea (O(1)) entre peticiones
const tokensRevocadosMemoria = new Map();

export async function revocarToken(jti, exp, idUsuario = null) {
  if (!jti) return;
  const expiracionMs = exp ? (exp * 1000) : (Date.now() + 8 * 60 * 60 * 1000);
  tokensRevocadosMemoria.set(jti, expiracionMs);

  try {
    await repo.revocarToken(jti, new Date(expiracionMs), idUsuario);
  } catch {
    // Si la BD no está disponible en ejecución/test, la memoria preserva la revocación
  }
}

export async function esTokenRevocado(jti) {
  if (!jti) return false;
  const ahora = Date.now();
  const expiracionMs = tokensRevocadosMemoria.get(jti);
  if (expiracionMs) {
    if (expiracionMs > ahora) return true;
    tokensRevocadosMemoria.delete(jti);
  }

  try {
    const enBd = await repo.esTokenRevocado(jti);
    if (enBd) {
      tokensRevocadosMemoria.set(jti, ahora + 60 * 60 * 1000);
      return true;
    }
  } catch {
    // Si la BD está offline, confiamos en memoria
  }
  return false;
}

export const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: env.cookieSameSite,
  secure: env.cookieSecure,
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
});

async function armarSesion(usuario) {
  const [permisos, sucursales] = await Promise.all([repo.listarPermisos(usuario.id_usuario), repo.listarSucursales(usuario.id_usuario)]);
  return {
    usuario: { id: usuario.id_usuario, username: usuario.username, rol: usuario.rol, sucursales },
    permisos,
  };
}

export async function login(username, password) {
  const usuario = await repo.buscarUsuarioPorUsername(username);
  // Mitigación de timing attack: si no existe el usuario, compara contra DUMMY_HASH para no delatar tiempo de cómputo
  const hashComparar = usuario?.password_hash || DUMMY_HASH;
  const passwordValido = await bcrypt.compare(password, hashComparar);
  const valido = Boolean(usuario && usuario.activo && passwordValido);
  if (!valido) {
    await repo.registrarIntentoLogin(username);
    throw new AppError('Usuario o contraseña incorrectos', 401);
  }

  await repo.registrarLogin(usuario.id_usuario);
  const token = jwt.sign({ id: usuario.id_usuario, rol: usuario.rol, tipo: 'admin', iat: Math.floor(Date.now() / 1000) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, jwtid: crypto.randomUUID() });
  return { token, ...(await armarSesion(usuario)) };
}

export async function perfil(idUsuario) {
  const usuario = await repo.buscarUsuarioPorId(idUsuario);
  if (!usuario) throw new AppError('Usuario no encontrado o inactivo', 401);
  return armarSesion(usuario);
}
