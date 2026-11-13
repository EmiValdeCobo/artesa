import * as service from './ordenes.service.js';

// POST /api/pos/ordenes
export async function crear(req, res) {
  const orden = await service.crearOrden(req.body, req.user.id);
  return res.status(201).json({ status: 'success', data: orden });
}

// GET /api/pos/ordenes
export async function listar(req, res) {
  const { id_turno, estado } = req.query;
  const ordenes = await service.listarOrdenes({ idTurno: id_turno, estado: estado ?? null });
  return res.json({ status: 'success', data: { ordenes } });
}

// GET /api/pos/ordenes/:id
export async function detalle(req, res) {
  const orden = await service.obtenerOrden(Number(req.params.id));
  return res.json({ status: 'success', data: orden });
}

// PUT /api/pos/ordenes/:id
export async function editar(req, res) {
  const orden = await service.editarOrden(Number(req.params.id), req.body, req.user.id);
  return res.json({ status: 'success', data: orden });
}

// PATCH /api/pos/ordenes/:id/estado
export async function cambiarEstado(req, res) {
  const resultado = await service.cambiarEstado(
    Number(req.params.id),
    req.body.estado,
    req.user.id,
  );
  return res.json({ status: 'success', data: resultado });
}

