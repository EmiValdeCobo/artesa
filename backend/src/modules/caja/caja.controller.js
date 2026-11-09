import * as service from './caja.service.js';
import { cerrarTurnoSchema, filtrosCuadresSchema, idTurnoSchema } from './caja.schemas.js';

export async function listarCajas(req, res) {
  res.json(await service.listarCajas(req.user.id));
}

export async function turnoActual(req, res) {
  res.json(await service.obtenerTurnoActual(req.user.id));
}

export async function abrirTurno(req, res) {
  res.status(201).json(await service.abrirTurno(req.body, req.user.id));
}

export async function listarMovimientos(req, res) {
  const idTurno = idTurnoSchema.parse(req.params.idTurno);
  res.json(await service.listarMovimientos(idTurno, req.user.id));
}

export async function registrarMovimiento(req, res) {
  const idTurno = idTurnoSchema.parse(req.params.idTurno);
  res.status(201).json(await service.registrarMovimiento(idTurno, req.body, req.user.id));
}

export async function cerrarTurno(req, res) {
  const idTurno = idTurnoSchema.parse(req.params.idTurno);
  const contado = cerrarTurnoSchema.parse(req.body);
  res.json(await service.cerrarTurno(idTurno, contado, req.user.id));
}

export async function obtenerCuadre(req, res) {
  const idTurno = idTurnoSchema.parse(req.params.idTurno);
  res.json(await service.obtenerCuadre(idTurno, req.user.id));
}

export async function listarCuadres(req, res) {
  const filtros = filtrosCuadresSchema.parse(req.query);
  res.json(await service.listarCuadres(filtros, req.user.id));
}
