import { IVA } from '../pos/impuestos.js';

function aEscala4(valor) {
  const texto = String(valor ?? '0').trim();
  if (!/^\d+(?:\.\d{1,4})?$/.test(texto)) return 0n;
  const [entero, decimal = ''] = texto.split('.');
  return BigInt(entero) * 10000n + BigInt(decimal.padEnd(4, '0'));
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
