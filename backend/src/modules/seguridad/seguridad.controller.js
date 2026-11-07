import * as service from './seguridad.service.js';
import { idPermisoSchema, idRolSchema } from './seguridad.schemas.js';

const idRol = (valor) => idRolSchema.parse(valor);
const idPermiso = (valor) => idPermisoSchema.parse(valor);

export async function listarUsuarios(_req, res) {
  res.json(await service.listarUsuarios());
}

export async function listarRoles(_req, res) {
  res.json(await service.listarRolesGestion());
}

export const listarPermisos = async (_req, res) => res.json(await service.listarPermisos());
export const crearRol = async (req, res) => res.status(201).json(await service.crearRol(req.body, req.user.id));
export const actualizarRol = async (req, res) => res.json(await service.actualizarRol(idRol(req.params.id), req.body, req.user.id));
export const eliminarRol = async (req, res) => { await service.eliminarRol(idRol(req.params.id), req.user.id); res.status(204).send(); };
export const crearPermiso = async (req, res) => res.status(201).json(await service.crearPermiso(req.body, req.user.id));
export const actualizarPermiso = async (req, res) => res.json(await service.actualizarPermiso(idPermiso(req.params.id), req.body, req.user.id));
export const eliminarPermiso = async (req, res) => { await service.eliminarPermiso(idPermiso(req.params.id), req.user.id); res.status(204).send(); };
export const listarPermisosDeRol = async (req, res) => res.json(await service.listarPermisosDeRol(idRol(req.params.id)));
export const reemplazarPermisos = async (req, res) => res.json(await service.reemplazarPermisos(idRol(req.params.id), req.body.idPermisos, req.user.id));
export const asignarPermiso = async (req, res) => res.status(201).json(await service.asignarPermiso(idRol(req.params.id), idPermiso(req.params.idPermiso), req.user.id));
export const revocarPermiso = async (req, res) => { await service.revocarPermiso(idRol(req.params.id), idPermiso(req.params.idPermiso), req.user.id); res.status(204).send(); };

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

export async function activarUsuario(req, res) {
  await service.activarUsuario(req.params.id, req.user.id);
  res.status(204).send();
}

export async function eliminarUsuario(req, res) {
  await service.eliminarUsuario(req.params.id, req.user.id);
  res.status(204).send();
}
