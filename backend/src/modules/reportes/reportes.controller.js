import * as service from './reportes.service.js';
import { filtrosAlertasSchema, filtrosTopProductosSchema, filtrosVentasSchema } from './reportes.schemas.js';

export async function ventasDiarias(req, res) {
  res.json(await service.ventasDiarias(filtrosVentasSchema.parse(req.query), req.user.id));
}

export async function topProductos(req, res) {
  res.json(await service.topProductos(filtrosTopProductosSchema.parse(req.query), req.user.id));
}

export async function alertasStock(req, res) {
  res.json(await service.alertasStock(filtrosAlertasSchema.parse(req.query), req.user.id));
}

export async function margenProductos(_req, res) {
  res.json(await service.margenProductos());
}