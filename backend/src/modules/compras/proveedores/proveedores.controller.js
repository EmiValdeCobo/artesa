import * as service from './proveedores.service.js';

export const listarProveedores = async (req, res) =>
  res.json(await service.listarProveedores(req.validatedQuery.activo));

export const crearProveedor = async (req, res) =>
  res.status(201).json(await service.crearProveedor(req.body, req.user.id));

export const actualizarProveedor = async (req, res) =>
  res.json(await service.actualizarProveedor(req.validatedParams.id, req.body, req.user.id));

export const desactivarProveedor = async (req, res) => {
  await service.desactivarProveedor(req.validatedParams.id, req.user.id);
  res.status(204).end();
};
