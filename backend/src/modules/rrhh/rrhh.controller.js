import * as service from './rrhh.service.js';
import { idEmpleadoSchema, idSchema } from './rrhh.schemas.js';

const id = (valor) => idSchema.parse(valor);
const idEmpleado = (valor) => idEmpleadoSchema.parse(valor);
export const listarPuestos = async (_req, res) => res.json(await service.listarPuestos());
export const crearPuesto = async (req, res) => res.status(201).json(await service.crearPuesto(req.body, req.user.id));
export const actualizarPuesto = async (req, res) =>
  res.json(await service.actualizarPuesto(id(req.params.id), req.body, req.user.id));
export const desactivarPuesto = async (req, res) => {
  await service.cambiarEstadoPuesto(id(req.params.id), false, req.user.id);
  res.status(204).end();
};
export const activarPuesto = async (req, res) => {
  await service.cambiarEstadoPuesto(id(req.params.id), true, req.user.id);
  res.status(204).end();
};
export const listarEmpleados = async (_req, res) => res.json(await service.listarEmpleados());
export const crearEmpleado = async (req, res) =>
  res.status(201).json(await service.crearEmpleado(req.body, req.user.id));
export const actualizarEmpleado = async (req, res) =>
  res.json(await service.actualizarEmpleado(idEmpleado(req.params.id), req.body, req.user.id));
export const desactivarEmpleado = async (req, res) => {
  await service.cambiarEstadoEmpleado(idEmpleado(req.params.id), false, req.user.id);
  res.status(204).end();
};
export const activarEmpleado = async (req, res) => {
  await service.cambiarEstadoEmpleado(idEmpleado(req.params.id), true, req.user.id);
  res.status(204).end();
};
