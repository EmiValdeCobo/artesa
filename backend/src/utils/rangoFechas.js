// Validación compartida de rangos de fechas ISO (YYYY-MM-DD) para reportes y cuadres.
const DIA_MS = 86_400_000;
export const MAX_DIAS_RANGO = 366;
export const MENSAJE_RANGO = 'Indica desde y hasta juntos (desde ≤ hasta y máximo 366 días)';

// Sin fechas es válido (el SQL usa los últimos 30 días); con una sola, no.
export function rangoFechasValido({ desde, hasta }) {
  if (!desde && !hasta) return true;
  if (!desde || !hasta) return false;
  const dias = (Date.parse(hasta) - Date.parse(desde)) / DIA_MS;
  return dias >= 0 && dias <= MAX_DIAS_RANGO;
}