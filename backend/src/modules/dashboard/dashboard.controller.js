import * as service from './dashboard.service.js';

// Solo HTTP: lee la petición ya validada (req.consulta), llama al servicio y responde.
// Los datos dependen del usuario y del permiso: nunca deben quedar en cachés compartidas.
const responder = (res, datos) => res.set('Cache-Control', 'no-store').json(datos);

export async function ventasDiarias(req, res) {
  responder(res, await service.ventasDiarias(req.user.id, req.consulta));
}

export async function topProductos(req, res) {
  responder(res, await service.topProductos(req.user.id, req.consulta));
}

export async function alertas(req, res) {
  responder(res, await service.alertas(req.user.id, req.consulta));
}
