import { ZONA_NEGOCIO } from '../config/negocio.js';

// Formato solo para MOSTRAR. Los importes llegan como string NUMERIC y el servidor ya los sumó:
// aquí nunca se suman ni se comparan importes.
const moneda = new Intl.NumberFormat('es-SV', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const moneda0 = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const entero = new Intl.NumberFormat('es-SV');

export const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
export const formatoDinero = (valor) => {
  if (valor === null || valor === undefined || valor === '') return moneda.format(0);
  const num = typeof valor === 'number' ? valor : Number(valor);
  return moneda.format(Number.isNaN(num) ? 0 : num);
};
export const formatoDineroCorto = (valor) => moneda0.format(valor ?? 0);
export const formatoEntero = (valor) => entero.format(valor ?? 0);

/**
 * Formatea cantidades físicas/conteos como números enteros sin decimales (ej. 1, 18, 250, 50),
 * eliminando decimales residuales que devuelve PostgreSQL (como 1.0000, 10.00 o 50.0000).
 */
export const formatearUnidades = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '0';
  const num = typeof valor === 'number' ? valor : Number(String(valor).trim());
  if (Number.isNaN(num)) return '0';
  return entero.format(Math.round(num));
};

/**
 * Limpia un valor de cantidad para inputs numéricos (<input type="number" step="1">),
 * asegurando un string entero limpio sin comas ni decimales innecesarios (ej. '1.0000' -> '1').
 */
export const enteroParaInput = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const num = typeof valor === 'number' ? valor : Number(String(valor).trim());
  if (Number.isNaN(num)) return '';
  return String(Math.round(num));
};

// 'YYYY-MM-DD' → Date local sin desfase de zona horaria.
export const fechaLocal = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
export const etiquetaDia = (iso) => fechaLocal(iso).toLocaleDateString('es-SV', { weekday: 'short', day: 'numeric' }).replace('.', '');
export const etiquetaDiaLarga = (iso) => fechaLocal(iso).toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' });
export const horaDe = (isoInstante) => new Date(isoInstante).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_NEGOCIO });

// Hora (0-23) y fecha larga en la zona del negocio.
export const horaNegocio = (ms) => Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: ZONA_NEGOCIO }).format(ms));
export const fechaNegocio = (ms) => capitalizar(new Date(ms).toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA_NEGOCIO }));
// 'YYYY-MM-DD' en la zona horaria del negocio para atributos dateTime y filtros
export const fechaISODelNegocio = (ms = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_NEGOCIO }).format(ms);

export const saludoPorHora = (hora) => (hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches');

// "hace un momento", "hace 3 min", "hace 2 h": para saber cuán fresco es lo que se ve.
export function haceCuanto(isoInstante, ahora) {
  const seg = Math.max(0, Math.round((ahora - new Date(isoInstante).getTime()) / 1000));
  if (seg < 45) return 'hace un momento';
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  return horas < 24 ? `hace ${horas} h` : 'hace más de un día';
}
