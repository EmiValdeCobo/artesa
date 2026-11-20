import { IVA } from '../pos/impuestos.js';

function aEscala4(valor) {
  const texto = String(valor ?? '0').trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(texto)) return 0n;
  const esNegativo = texto.startsWith('-');
  const limpio = texto.replace(/^[+-]/, '');
  const [entero, decimal = ''] = limpio.split('.');
  const d4 = decimal.slice(0, 4).padEnd(4, '0');
  const quinto = decimal[4] || '0';
  let bDecimal = BigInt(d4);
  if (quinto >= '5') bDecimal += 1n;
  const res = BigInt(entero) * 10000n + bDecimal;
  return esNegativo ? -res : res;
}

// Devuelve porcentaje con una cifra decimal; todos los cálculos intermedios son enteros.
export function calcularMargen(precioConIva, costo, iva = IVA) {
  const precioCentavos = aEscala4(precioConIva) / 100n;
  const costoEscala = aEscala4(costo);
  if (precioCentavos <= 0n) return null;
  const ivaPorcentaje = BigInt(Math.round(iva * 100));
  const denominador = precioCentavos * 10000n;
  const numerador = denominador - costoEscala * (100n + ivaPorcentaje);
  const decimas = (numerador * 1000n + (numerador >= 0n ? denominador / 2n : -denominador / 2n)) / denominador;
  return Number(decimas) / 10;
}

export function calcularMargenDolares(precioConIva, costo, iva = IVA) {
  const precioCentavos = aEscala4(precioConIva) / 100n;
  const ivaPorcentaje = BigInt(Math.round(iva * 100));
  const precioNetoEscala4 = (precioCentavos * 10000n + (100n + ivaPorcentaje) / 2n) / (100n + ivaPorcentaje);
  return (Number(precioNetoEscala4 - aEscala4(costo)) / 10000).toFixed(4);
}

export function calcularCostoReceta(componentes) {
  const total = componentes.reduce((suma, item) => {
    const cantidad = aEscala4(item.cantidad_requerida);
    const costo = aEscala4(item.costo_promedio);
    return suma + (cantidad * costo + 5000n) / 10000n;
  }, 0n);
  return (Number(total) / 10000).toFixed(4);
}

// Subtotal por línea de receta (BigInt, sin float). Devuelve string con 4 decimales.
// Para uso en tabla — evita Number(cant)*Number(costo) que viola la regla anti-float.
export function calcularSubtotalLinea(cantidad_requerida, costo_promedio) {
  const cantidad = aEscala4(cantidad_requerida);
  const costo = aEscala4(costo_promedio);
  return ((Number((cantidad * costo + 5000n) / 10000n)) / 10000).toFixed(4);
}

/**
 * Calcula el precio sugerido con IVA (13%) para alcanzar un margen objetivo (por defecto 40%).
 * Fórmula oficial: (Costo Teórico / (1 - 0.40)) * 1.13
 * Todos los cálculos intermedios usan aritmética entera BigInt anti-float.
 */
export function calcularPrecioSugerido(costo, margenObjetivo = 0.40, iva = IVA) {
  const costoEscala = aEscala4(costo);
  if (costoEscala <= 0n) return '0.00';
  const ivaPorcentaje = BigInt(Math.round(iva * 100));
  const margenPct = BigInt(Math.round(margenObjetivo * 100));
  const denominadorMargen = 100n - margenPct;
  if (denominadorMargen <= 0n) return '0.00';
  const numerador = costoEscala * (100n + ivaPorcentaje);
  const centavos = (numerador + (denominadorMargen * 100n) / 2n) / (denominadorMargen * 100n);
  return (Number(centavos) / 100).toFixed(2);
}

