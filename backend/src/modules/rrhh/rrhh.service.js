import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './rrhh.repository.js';

function traducir(error) {
  const pg = error.original ?? error.parent ?? error;
  if (pg.code === '23505') return new AppError('Ya existe un puesto, DUI o usuario asociado con esos datos', 409);
  if (pg.code === '23503') return new AppError('La sucursal, puesto o usuario seleccionado no existe', 400);
  if (pg.code === '23514' || pg.code === '23502') return new AppError('Los datos del empleado no son válidos', 400);
  return error;
}

async function validarReferencias(datos, transaction) {
  if (!(await repo.buscarSucursalActiva(datos.idSucursal, transaction)))
    throw new AppError('La sucursal no existe o está inactiva', 400);
  if (!(await repo.buscarPuestoActivo(datos.idPuesto, transaction)))
    throw new AppError('El puesto no existe o está inactivo', 400);
}

export const listarPuestos = () => repo.listarPuestos();
export const listarEmpleados = () => repo.listarEmpleados();

export async function crearPuesto(datos, userId) {
  try {
    return await withTransaction((t) => repo.crearPuesto(datos, t), userId);
  } catch (e) {
    throw traducir(e);
  }
}

export async function actualizarPuesto(id, datos, userId) {
  try {
    return await withTransaction(async (t) => {
      const actualizado = await repo.actualizarPuesto(id, datos, t);
      if (!actualizado) throw new AppError('Puesto no encontrado', 404);
      return actualizado;
    }, userId);
  } catch (e) {
    throw traducir(e);
  }
}

export async function cambiarEstadoPuesto(id, activo, userId) {
  try {
    await withTransaction(async (t) => {
      const puesto = await repo.buscarPuesto(id, t);
      if (!puesto) throw new AppError('Puesto no encontrado', 404);
      if (!activo && (await repo.contarEmpleadosPorPuesto(id, t)))
        throw new AppError('No se puede desactivar un puesto con empleados asignados', 409);
      const afectados = activo ? await repo.activarPuesto(id, t) : await repo.desactivarPuesto(id, t);
      if (!afectados) throw new AppError(activo ? 'El puesto ya está activo' : 'El puesto ya está inactivo', 404);
    }, userId);
  } catch (e) {
    throw traducir(e);
  }
}

export async function crearEmpleado(datos, userId) {
  try {
    return await withTransaction(async (t) => {
      await validarReferencias(datos, t);
      return repo.crearEmpleado(datos, t);
    }, userId);
  } catch (e) {
    throw traducir(e);
  }
}

export async function actualizarEmpleado(id, datos, userId) {
  try {
    return await withTransaction(async (t) => {
      await validarReferencias(datos, t);
      const empleado = await repo.actualizarEmpleado(id, datos, t);
      if (!empleado) throw new AppError('Empleado no encontrado', 404);
      return empleado;
    }, userId);
  } catch (e) {
    throw traducir(e);
  }
}

export async function cambiarEstadoEmpleado(id, activo, userId) {
  try {
    await withTransaction(async (t) => {
      if (!(await repo.buscarEmpleado(id, t))) throw new AppError('Empleado no encontrado', 404);
      if (!(await repo.cambiarEstadoEmpleado(id, activo, t)))
        throw new AppError(activo ? 'El empleado ya está activo' : 'El empleado ya está inactivo', 404);
    }, userId);
  } catch (e) {
    throw traducir(e);
  }
}
