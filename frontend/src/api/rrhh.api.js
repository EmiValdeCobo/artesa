import { api } from './client.js';

export const rrhhApi = {
  // ─── Puestos ────────────────────────────────────────────────────────────────
  listarPuestos: (opciones) => api.get('/rrhh/puestos', opciones),
  crearPuesto: (datos, opciones) => api.post('/rrhh/puestos', datos, opciones),
  actualizarPuesto: (id, datos, opciones) => api.put(`/rrhh/puestos/${id}`, datos, opciones),
  desactivarPuesto: (id, opciones) => api.delete(`/rrhh/puestos/${id}`, opciones),
  activarPuesto: (id, opciones) => api.patch(`/rrhh/puestos/${id}/activar`, {}, opciones),

  // ─── Empleados ──────────────────────────────────────────────────────────────
  listarEmpleados: (opciones) => api.get('/rrhh/empleados', opciones),
  crearEmpleado: (datos, opciones) => api.post('/rrhh/empleados', datos, opciones),
  actualizarEmpleado: (id, datos, opciones) => api.put(`/rrhh/empleados/${id}`, datos, opciones),
  desactivarEmpleado: (id, opciones) => api.delete(`/rrhh/empleados/${id}`, opciones),
  activarEmpleado: (id, opciones) => api.patch(`/rrhh/empleados/${id}/activar`, {}, opciones),

  // ─── Planillas ──────────────────────────────────────────────────────────────
  listarPlanillas: (filtros = {}, opciones) => {
    const params = new URLSearchParams();
    if (filtros.idSucursal) params.append('idSucursal', filtros.idSucursal);
    if (filtros.desde) params.append('desde', filtros.desde);
    if (filtros.hasta) params.append('hasta', filtros.hasta);
    const q = params.toString();
    return api.get(`/rrhh/planillas${q ? `?${q}` : ''}`, opciones);
  },
  obtenerPlanilla: (id, opciones) => api.get(`/rrhh/planillas/${id}`, opciones),
  crearPlanilla: (datos, opciones) => api.post('/rrhh/planillas', datos, opciones),
  calcularPlanilla: (id, opciones) => api.post(`/rrhh/planillas/${id}/calculo`, {}, opciones),
  procesarPlanilla: (id, opciones) => api.post(`/rrhh/planillas/${id}/procesamiento`, {}, opciones),

  // ─── Auxiliares para catálogos relacionados ──────────────────────────────────
  listarSucursales: (opciones) => api.get('/empresa/sucursales', opciones),
  listarUsuarios: (opciones) => api.get('/seguridad/usuarios', opciones),
};
