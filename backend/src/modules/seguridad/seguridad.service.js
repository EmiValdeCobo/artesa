import bcrypt from 'bcryptjs';
import { withTransaction } from '../../config/db.js';
import { Rol, Sucursal } from '../../models/index.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './seguridad.repository.js';

function traducirError(error) {
  if (error.code === '23505') return new AppError('El nombre de usuario ya existe', 409);
  if (error.code === '23503') return new AppError('El rol o una sucursal no existe o está inactiva', 400);
  return error;
}

async function validarReferencias(transaction, idRol, sucursales) {
  const rol = await Rol.findOne({ where: { id_rol: idRol, activo: true }, transaction });
  if (!rol) throw new AppError('El rol seleccionado no existe o está inactivo', 400);
  const total = await Sucursal.count({ where: { activa: true, id_sucursal: sucursales }, transaction });
  if (total !== sucursales.length) {
    throw new AppError('Una o más sucursales no existen o están inactivas', 400);
  }
}

export const listarUsuarios = () => repo.listarUsuarios();
export const listarRoles = () => repo.listarRoles();
export const listarSucursales = () => repo.listarSucursales();

export async function crearUsuario(datos, userId) {
  try {
    return await withTransaction(async (transaction) => {
      await validarReferencias(transaction, datos.idRol, datos.sucursales);
      const passwordHash = await bcrypt.hash(datos.password, 10);
      const idUsuario = await repo.crearUsuario(transaction, { ...datos, passwordHash });
      await repo.asignarSucursales(transaction, idUsuario, datos.sucursales);
      return repo.buscarUsuario(idUsuario, transaction);
    }, userId);
  } catch (error) {
    throw traducirError(error);
  }
}

export async function actualizarUsuario(idUsuario, datos, userId) {
  try {
    return await withTransaction(async (transaction) => {
      await validarReferencias(transaction, datos.idRol, datos.sucursales);
      const passwordHash = datos.password ? await bcrypt.hash(datos.password, 10) : null;
      const actualizado = await repo.actualizarUsuario(transaction, idUsuario, { ...datos, passwordHash });
      if (!actualizado) throw new AppError('Usuario no encontrado', 404);
      await repo.asignarSucursales(transaction, idUsuario, datos.sucursales);
      return repo.buscarUsuario(idUsuario, transaction);
    }, userId);
  } catch (error) {
    throw traducirError(error);
  }
}

export async function desactivarUsuario(idUsuario, userId) {
  try {
    const resultado = await withTransaction((transaction) => repo.desactivarUsuario(transaction, idUsuario), userId);
    if (!resultado) throw new AppError('Usuario no encontrado o ya está inactivo', 404);
  } catch (error) {
    throw traducirError(error);
  }
}

