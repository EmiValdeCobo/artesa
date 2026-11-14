import { api } from './client.js';

export const cajaApi = {
  listarCajas: (opciones) => api.get('/cajas', opciones),
  obtenerTurnoActual: (opciones) => api.get('/turnos/actual', opciones),
  abrirTurno: (datos, opciones) => api.post('/turnos', datos, opciones),
  listarMovimientos: (idTurno, opciones) => api.get(`/turnos/${idTurno}/movimientos`, opciones),
  registrarMovimiento: (idTurno, datos, opciones) => api.post(`/turnos/${idTurno}/movimientos`, datos, opciones),
  cerrarTurno: (idTurno, datos, opciones) => api.post(`/turnos/${idTurno}/cierre`, datos, opciones),
  obtenerCuadre: (idTurno, opciones) => api.get(`/turnos/${idTurno}/cuadre`, opciones),
  listarCuadres: (filtros = {}, opciones) => {
    const params = new URLSearchParams();
    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.desde) params.append('desde', filtros.desde);
    if (filtros.hasta) params.append('hasta', filtros.hasta);
    if (filtros.idSucursal) params.append('idSucursal', filtros.idSucursal);
    const q = params.toString();
    return api.get(`/turnos/cuadres${q ? `?${q}` : ''}`, opciones);
  },
};
