import * as service from './seguridad.service.js';

export async function listarUsuarios(_req, res) {
  res.json(await service.listarUsuarios());
}

export async function listarRoles(_req, res) {
  res.json(await service.listarRoles());
}

export async function listarSucursales(_req, res) {
  res.json(await service.listarSucursales());
}

export async function crearUsuario(req, res) {
  res.status(201).json(await service.crearUsuario(req.body, req.user.id));
}

export async function actualizarUsuario(req, res) {
  res.json(await service.actualizarUsuario(req.params.id, req.body, req.user.id));
}

export async function desactivarUsuario(req, res) {
  await service.desactivarUsuario(req.params.id, req.user.id);
  res.status(204).send();
}

