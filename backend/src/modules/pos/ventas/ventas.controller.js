import * as service from './ventas.service.js';

// POST /api/pos/ventas
export async function registrar(req, res) {
  const venta = await service.registrarVenta(req.body, req.user.id);
  return res.status(201).json({ status: 'success', data: venta });
}

// GET /api/pos/ventas
export async function listar(req, res) {
  const { id_turno, estado } = req.query;
  const ventas = await service.listarVentas({ idTurno: id_turno ?? null, estado: estado ?? null });
  return res.json({ status: 'success', data: { ventas } });
}

// GET /api/pos/ventas/:id
export async function detalle(req, res) {
  const venta = await service.obtenerVenta(req.params.id);
  return res.json({ status: 'success', data: venta });
}

