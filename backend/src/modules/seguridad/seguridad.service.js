import bcrypt from 'bcryptjs';
import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './seguridad.repository.js';

function traducirError(error) {
  if (error.code === '23505') return new AppError('El nombre de usuario ya existe', 409);
  if (error.code === '23503') return new AppError('El rol o una sucursal no existe o está inactiva', 400);
  return error;
}

async function validarReferencias(client, idRol, sucursales) {
  const rol = await client.query('SELECT 1 FROM seguridad.roles WHERE id_rol = $1 AND activo', [idRol]);
  if (!rol.rowCount) throw new AppError('El rol seleccionado no existe o está inactivo', 400);
  const sucursalesResult = await client.query(
    'SELECT count(*)::int AS total FROM empresa.sucursales WHERE activa AND id_sucursal = ANY($1::int[])',
    [sucursales],
  );
  if (sucursalesResult.rows[0].total !== sucursales.length) {
    throw new AppError('Una o más sucursales no existen o están inactivas', 400);
  }
}

export const listarUsuarios = () => repo.listarUsuarios();
export const listarRoles = () => repo.listarRoles();
export const listarSucursales = () => repo.listarSucursales();

export async function crearUsuario(datos, userId) {
  try {
    return await withTransaction(async (client) => {
      await validarReferencias(client, datos.idRol, datos.sucursales);
      const passwordHash = await bcrypt.hash(datos.password, 10);
      const idUsuario = await repo.crearUsuario(client, { ...datos, passwordHash });
      await repo.asignarSucursales(client, idUsuario, datos.sucursales);
      return repo.buscarUsuario(idUsuario, client);
    }, userId);
  } catch (error) {
    throw traducirError(error);
  }
}

export async function actualizarUsuario(idUsuario, datos, userId) {
  try {
    return await withTransaction(async (client) => {
      await validarReferencias(client, datos.idRol, datos.sucursales);
      const passwordHash = datos.password ? await bcrypt.hash(datos.password, 10) : null;
      const actualizado = await repo.actualizarUsuario(client, idUsuario, { ...datos, passwordHash });
      if (!actualizado) throw new AppError('Usuario no encontrado', 404);
      await repo.asignarSucursales(client, idUsuario, datos.sucursales);
      return repo.buscarUsuario(idUsuario, client);
    }, userId);
  } catch (error) {
    throw traducirError(error);
  }
}

export async function desactivarUsuario(idUsuario, userId) {
  try {
    const resultado = await withTransaction((client) => repo.desactivarUsuario(client, idUsuario), userId);
    if (!resultado) throw new AppError('Usuario no encontrado o ya está inactivo', 404);
  } catch (error) {
    throw traducirError(error);
  }
}

