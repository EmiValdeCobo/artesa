// Períodos de consulta de Compras (sin dependencias de React para poder probarlos).
// Un período es: { modo: 'mes', anio, mes } · { modo: 'anio', anio } · { modo: 'rango', desde, hasta } · { modo: 'todo' }.
// Se traduce a desde/hasta (AAAA-MM-DD) para que el backend filtre antes de paginar.

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const MAX_DIAS_RANGO = 366; // mismo límite que backend/src/utils/rangoFechas.js

const dos = (n) => String(n).padStart(2, '0');
const DIA_MS = 86_400_000;

export function hoyElSalvador(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(fecha);
  const valor = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valor.year}-${valor.month}-${valor.day}`;
}

export function mesActual(hoy = hoyElSalvador()) {
  const [anio, mes] = hoy.split('-').map(Number);
  return { modo: 'mes', anio, mes };
}

export function desplazar(periodo, paso) {
  if (periodo.modo === 'anio') return { ...periodo, anio: periodo.anio + paso };
  if (periodo.modo !== 'mes') return periodo;
  const indice = periodo.anio * 12 + (periodo.mes - 1) + paso;
  return { modo: 'mes', anio: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

export const mesAnterior = (hoy) => desplazar(mesActual(hoy), -1);

const ultimoDia = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

export function rangoDePeriodo(periodo) {
  if (periodo.modo === 'mes') return { desde: `${periodo.anio}-${dos(periodo.mes)}-01`, hasta: `${periodo.anio}-${dos(periodo.mes)}-${dos(ultimoDia(periodo.anio, periodo.mes))}` };
  if (periodo.modo === 'anio') return { desde: `${periodo.anio}-01-01`, hasta: `${periodo.anio}-12-31` };
  if (periodo.modo === 'rango' && !errorRango(periodo)) return { desde: periodo.desde, hasta: periodo.hasta };
  return {};
}

export function errorRango({ desde, hasta }) {
  if (!desde || !hasta) return 'Indica las dos fechas del rango.';
  if (desde > hasta) return 'La fecha inicial no puede ser posterior a la final.';
  if ((Date.parse(hasta) - Date.parse(desde)) / DIA_MS > MAX_DIAS_RANGO) return 'El rango no puede superar 366 días.';
  return '';
}

export function etiquetaPeriodo(periodo) {
  if (periodo.modo === 'mes') return `${MESES[periodo.mes - 1]} ${periodo.anio}`;
  if (periodo.modo === 'anio') return `Año ${periodo.anio}`;
  if (periodo.modo === 'rango') return periodo.desde && periodo.hasta ? `${periodo.desde} a ${periodo.hasta}` : 'Rango personalizado';
  return 'Todas las fechas';
}

// Opción que muestra el selector según el período actual.
export function opcionDePeriodo(periodo, hoy = hoyElSalvador()) {
  if (periodo.modo !== 'mes') return periodo.modo;
  const actual = mesActual(hoy);
  const anterior = mesAnterior(hoy);
  if (periodo.anio === actual.anio && periodo.mes === actual.mes) return 'este';
  if (periodo.anio === anterior.anio && periodo.mes === anterior.mes) return 'anterior';
  return 'mes';
}

// Suma en centavos (BigInt) de los importes NUMERIC que llegan como string: nunca float.
export function aCentavos(valor) {
  const partes = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(valor ?? '0').trim());
  if (!partes) return 0n;
  const centavos = BigInt(partes[2]) * 100n + BigInt((partes[3] ?? '').padEnd(2, '0').slice(0, 2));
  return partes[1] ? -centavos : centavos;
}

export function totalesPeriodo(filas) {
  return filas.reduce((suma, fila) => ({
    total: suma.total + aCentavos(fila.total),
    pagado: suma.pagado + aCentavos(fila.pagado),
    saldo: suma.saldo + aCentavos(fila.saldo),
  }), { total: 0n, pagado: 0n, saldo: 0n });
}
