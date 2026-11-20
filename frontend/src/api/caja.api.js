import { api } from './client.js';

// Evento global: Caja lo emite al abrir o cerrar un turno para que el indicador del layout se refresque.
export const EVENTO_TURNO_CAMBIO = 'artesa:turno-cambio';
export const avisarCambioTurno = () => window.dispatchEvent(new CustomEvent(EVENTO_TURNO_CAMBIO));

export const cajaApi = {
  listarCajas: (opciones) => api.get('/cajas', opciones),
  obtenerTurnoActual: (opciones) => api.get('/turnos/actual', opciones),
  abrirTurno: (datos, opciones) => api.post('/turnos', datos, opciones),
  listarMovimientos: (idTurno, opciones) => api.get(`/turnos/${idTurno}/movimientos`, opciones),
  registrarMovimiento: (idTurno, datos, opciones) => api.post(`/turnos/${idTurno}/movimientos`, datos, opciones),
  cerrarTurno: (idTurno, datos, opciones) => api.post(`/turnos/${idTurno}/cierre`, datos, opciones),
  // Pedidos de la cola de preparación (Nueva/En preparación/Lista) que impiden cerrar el turno.
  pedidosPendientes: (idTurno, opciones) => api.get(`/turnos/${idTurno}/pedidos-pendientes`, opciones),
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
