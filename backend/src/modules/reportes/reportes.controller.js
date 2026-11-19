import * as service from './reportes.service.js';
import { enviarHeadersPaginacion } from '../../utils/paginacion.js';
import {
  filtrosAlertasSchema,
  filtrosCuentasPorPagarSchema,
  filtrosCuadreSchema,
  filtrosTopProductosSchema,
  filtrosVentasSchema,
} from './reportes.schemas.js';

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
export async function cuadreTurnos(req, res) {
  res.json(await service.cuadreTurnos(filtrosCuadreSchema.parse(req.query), req.user.id));
}

export async function cuentasPorPagar(req, res) {
  const resultado = await service.cuentasPorPagar(filtrosCuentasPorPagarSchema.parse(req.query), req.user.id);
  enviarHeadersPaginacion(res, resultado.pagination);
  res.json(resultado.data);
}

export async function ventasPorMetodoPago(req, res) {
  res.json(await service.ventasPorMetodoPago(filtrosVentasSchema.parse(req.query), req.user.id));
}
export async function margenBajo(_req, res) {
  res.json(await service.margenBajo());
}
