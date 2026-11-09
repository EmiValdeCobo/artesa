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
export const listarRolesGestion = () => repo.listarRolesGestion();
export const listarSucursales = () => repo.listarSucursales();
export const listarPermisos = () => repo.listarPermisos();

function traducirErrorRbac(error) {
  const origen = error.original ?? error.parent ?? error;
  if (origen.code === '23505' && origen.constraint === 'roles_nombre_key') return new AppError('El nombre del rol ya existe', 409);
  if (origen.code === '23505' && origen.constraint === 'permisos_codigo_key') return new AppError('El código del permiso ya existe', 409);
  if (origen.code === '23505') return new AppError('La asignación ya existe', 409);
  if (origen.code === '23503') return new AppError('El recurso referenciado no existe o está en uso', 409);
  return error;
}

async function validarRolActivo(transaction, idRol) {
  const rol = await repo.buscarRol(idRol, transaction);
  if (!rol || !rol.activo) throw new AppError('El rol no existe o está inactivo', 404);
  return rol;
}

async function validarPermisos(transaction, idsPermisos) {
  const total = await repo.contarPermisos(transaction, idsPermisos);
  if (total !== idsPermisos.length) throw new AppError('Uno o más permisos no existen', 400);
}

export async function crearRol(datos, userId) {
  try {
    return await withTransaction(async (transaction) => repo.buscarRol(await repo.crearRol(transaction, datos), transaction), userId);
  } catch (error) { throw traducirErrorRbac(error); }
}

export async function actualizarRol(idRol, datos, userId) {
  try {
    return await withTransaction(async (transaction) => {
      await validarRolActivo(transaction, idRol);
      if (!(await repo.actualizarRol(transaction, idRol, datos))) throw new AppError('Rol no encontrado', 404);
      return repo.buscarRol(idRol, transaction);
    }, userId);
  } catch (error) { throw traducirErrorRbac(error); }
}

export async function eliminarRol(idRol, userId) {
  try {
    await withTransaction(async (transaction) => {
      const rol = await validarRolActivo(transaction, idRol);
      if (rol.es_sistema) throw new AppError('Los roles del sistema no se pueden eliminar', 409);
      if (!(await repo.eliminarRol(transaction, idRol))) throw new AppError('Rol no encontrado', 404);
    }, userId);
  } catch (error) { throw traducirErrorRbac(error); }
}

export async function crearPermiso(datos, userId) {
  try { return await withTransaction((transaction) => repo.crearPermiso(transaction, datos), userId); }
  catch (error) { throw traducirErrorRbac(error); }
}

export async function actualizarPermiso(idPermiso, datos, userId) {
  try {
    return await withTransaction(async (transaction) => {
      if (!(await repo.buscarPermiso(idPermiso, transaction))) throw new AppError('Permiso no encontrado', 404);
      if (!(await repo.actualizarPermiso(transaction, idPermiso, datos))) throw new AppError('Permiso no encontrado', 404);
      return repo.buscarPermiso(idPermiso, transaction);
    }, userId);
  } catch (error) { throw traducirErrorRbac(error); }
}

export async function eliminarPermiso(idPermiso, userId) {
  try {
    await withTransaction(async (transaction) => {
      if (!(await repo.buscarPermiso(idPermiso, transaction))) throw new AppError('Permiso no encontrado', 404);
      await repo.eliminarPermiso(transaction, idPermiso);
    }, userId);
  } catch (error) { throw traducirErrorRbac(error); }
}

export async function listarPermisosDeRol(idRol) {
  const permisos = await repo.listarPermisosRol(idRol);
  if (!permisos) throw new AppError('Rol no encontrado', 404);
  return permisos;
}

export async function reemplazarPermisos(idRol, idsPermisos, userId) {
  try {
    return await withTransaction(async (transaction) => {
      await validarRolActivo(transaction, idRol);
      await validarPermisos(transaction, idsPermisos);
      await repo.reemplazarPermisos(transaction, idRol, idsPermisos);
      return repo.listarPermisosRol(idRol, transaction);
    }, userId);
  } catch (error) { throw traducirErrorRbac(error); }
}

export async function asignarPermiso(idRol, idPermiso, userId) {
  try {
    return await withTransaction(async (transaction) => {
      await validarRolActivo(transaction, idRol);
      await validarPermisos(transaction, [idPermiso]);
      await repo.asignarPermiso(transaction, idRol, idPermiso);
      return repo.listarPermisosRol(idRol, transaction);
    }, userId);
  } catch (error) { throw traducirErrorRbac(error); }
}

export async function revocarPermiso(idRol, idPermiso, userId) {
  try {
    await withTransaction(async (transaction) => {
      await validarRolActivo(transaction, idRol);
      const afectados = await repo.revocarPermiso(transaction, idRol, idPermiso);
      if (!afectados) throw new AppError('La asignación no existe', 404);
    }, userId);
  } catch (error) { throw traducirErrorRbac(error); }
}

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
  if (String(idUsuario) === String(userId)) {
    throw new AppError('No puedes desactivar tu propio usuario', 403);
  }
  try {
    const resultado = await withTransaction((transaction) => repo.desactivarUsuario(transaction, idUsuario), userId);
    if (!resultado) throw new AppError('Usuario no encontrado o ya está inactivo', 404);
  } catch (error) {
    throw traducirError(error);
  }
}

export async function activarUsuario(idUsuario, userId) {
  try {
    const resultado = await withTransaction((transaction) => repo.activarUsuario(transaction, idUsuario), userId);
    if (!resultado) throw new AppError('Usuario no encontrado o ya está activo', 404);
  } catch (error) {
    throw traducirError(error);
  }
}

export async function eliminarUsuario(idUsuario, userId) {
  if (String(idUsuario) === String(userId)) {
    throw new AppError('No puedes eliminar tu propio usuario', 403);
  }
  try {
    const resultado = await withTransaction((transaction) => repo.eliminarUsuario(transaction, idUsuario), userId);
    if (!resultado) throw new AppError('Usuario no encontrado', 404);
  } catch (error) {
    throw traducirError(error);
  }
}
