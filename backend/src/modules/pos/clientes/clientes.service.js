import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './clientes.repository.js';

function mapearErrorPG(err) {
  if (err.code === '23505') {
    return new AppError('Ya existe un cliente registrado con ese tipo y número de documento', 409);
  }
  if (err.code === '23503') {
    return new AppError('No se puede eliminar el cliente porque tiene ventas asociadas', 409);
  }
  return err;
}

export const listarClientes = (filtros) => repo.listarClientes(filtros);

export async function obtenerCliente(idCliente) {
  const cliente = await repo.obtenerCliente(idCliente);
  if (!cliente) throw new AppError('Cliente no encontrado', 404);
  return cliente;
}

export async function crearCliente(body, userId) {
  try {
    return await withTransaction((tx) => repo.crearCliente(tx, body), userId);
  } catch (err) {
    throw mapearErrorPG(err);
  }
}

export async function actualizarCliente(idCliente, body, userId) {
  try {
    return await withTransaction(async (tx) => {
      const actualizado = await repo.actualizarCliente(tx, idCliente, body);
      if (!actualizado) throw new AppError('Cliente no encontrado', 404);
      return actualizado;
    }, userId);
  } catch (err) {
    throw mapearErrorPG(err);
  }
}

export async function eliminarCliente(idCliente, userId) {
  try {
    return await withTransaction(async (tx) => {
      const eliminado = await repo.eliminarCliente(tx, idCliente);
      if (!eliminado) throw new AppError('Cliente no encontrado', 404);
      return eliminado;
    }, userId);
  } catch (err) {
    throw mapearErrorPG(err);
  }
}