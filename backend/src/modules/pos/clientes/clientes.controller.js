import * as service from './clientes.service.js';

export async function listar(req, res) {
  const { q, solo_ccf } = req.query;
  const clientes = await service.listarClientes({ q, soloCcf: solo_ccf });
  return res.json({ status: 'success', data: { clientes } });
}

export async function detalle(req, res) {
  const cliente = await service.obtenerCliente(Number(req.params.id));
  return res.json({ status: 'success', data: cliente });
}

export async function crear(req, res) {
  const cliente = await service.crearCliente(req.body, req.user.id);
  return res.status(201).json({ status: 'success', data: cliente });
}

export async function actualizar(req, res) {
  const cliente = await service.actualizarCliente(Number(req.params.id), req.body, req.user.id);
  return res.json({ status: 'success', data: cliente });
}

export async function eliminar(req, res) {
  await service.eliminarCliente(Number(req.params.id), req.user.id);
  return res.status(204).send();
}