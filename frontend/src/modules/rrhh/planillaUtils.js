// Utilidades compartidas por el listado (PlanillasPage) y el detalle (PlanillaDetallePage) de planillas.

// Estado de una planilla: procesada (cerrada), calculada (tiene empleados) o sin calcular.
//   procesada: boolean · empleados: cantidad de empleados calculados (número o texto)
export function estadoPlanilla({ procesada, empleados } = {}) {
  if (procesada) return { clave: 'procesada', texto: 'Procesada', tipo: 'exito' };
  if (Number(empleados) > 0) return { clave: 'calculada', texto: 'Calculada', tipo: 'info' };
  return { clave: 'sin_calcular', texto: 'Sin calcular', tipo: 'aviso' };
}

// PDF de la planilla completa (solo procesadas). La URL no cambia.
export function abrirPdfPlanilla(idPlanilla) {
  window.open(`/api/rrhh/planillas/${idPlanilla}/pdf`, '_blank');
}

// Boleta individual de un empleado. La URL no cambia.
export function abrirBoletaEmpleado(idPlanilla, idEmpleado) {
  window.open(`/api/rrhh/planillas/${idPlanilla}/empleados/${idEmpleado}/boleta.pdf`, '_blank');
}
