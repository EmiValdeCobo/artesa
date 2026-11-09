import * as service from './preparacion.service.js';
import { filtrosColaSchema, idOrdenSchema } from './preparacion.schemas.js';

export async function listarCola(req, res) {
  res.json(await service.listarCola(filtrosColaSchema.parse(req.query), req.user.id));
}

export async function cambiarEstado(req, res) {
  const idOrden = idOrdenSchema.parse(req.params.idOrden);
  res.json(await service.cambiarEstado(idOrden, req.body.estado, req.user.id));
}
