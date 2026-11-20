// Simulación de pago con tarjeta (sin pasarela real). Lógica pura: sin React, testeable con node:test.
// Para conectar una pasarela real se reemplaza `procesarPagoTarjeta`; el resto del cobro no cambia.
//
// SEGURIDAD: el número completo, el CVV y el vencimiento viven solo en el estado local del formulario.
// Lo único que sale de aquí hacia el backend es: marca, últimos 4 dígitos y autorización generada.
//
// Tarjetas de prueba (cualquier titular, vencimiento futuro y CVV válido):
//   4242 4242 4242 4242  → Visa, APROBADA
//   5555 5555 5555 4444  → Mastercard, APROBADA
//   3782 822463 10005    → American Express (CVV de 4 dígitos), APROBADA
//   4000 0000 0000 0002  → Visa, RECHAZADA ("Tarjeta rechazada (simulación)")

export const TARJETAS_PRUEBA = {
  aprobada: '4242424242424242',
  aprobadaMastercard: '5555555555554444',
  aprobadaAmex: '378282246310005',
  rechazada: '4000000000000002',
};
const RECHAZADAS = new Set([TARJETAS_PRUEBA.rechazada]);

export const MARCAS = {
  VISA: { nombre: 'Visa', largoCvv: 3 },
  MASTERCARD: { nombre: 'Mastercard', largoCvv: 3 },
  AMEX: { nombre: 'American Express', largoCvv: 4 },
};

const soloDigitos = (v) => String(v ?? '').replace(/\D/g, '');

// Algoritmo de Luhn (módulo 10).
export function validarLuhn(numero) {
  const d = soloDigitos(numero);
  if (d.length < 13 || d.length > 19) return false;
  let suma = 0;
  for (let i = 0; i < d.length; i += 1) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    suma += n;
  }
  return suma % 10 === 0;
}

// Marca por prefijo (IIN): Visa 4; Mastercard 51-55 y 2221-2720; Amex 34/37.
export function detectarMarca(numero) {
  const d = soloDigitos(numero);
  if (/^3[47]/.test(d)) return 'AMEX';
  if (/^4/.test(d)) return 'VISA';
  if (/^5[1-5]/.test(d)) return 'MASTERCARD';
  const p4 = Number(d.slice(0, 4));
  if (d.length >= 4 && p4 >= 2221 && p4 <= 2720) return 'MASTERCARD';
  return null;
}

// "4242424242424242" → "4242 4242 4242 4242"; Amex 4-6-5. Máximo 19 dígitos.
export function mascaraNumeroTarjeta(valor) {
  const d = soloDigitos(valor).slice(0, 19);
  if (detectarMarca(d) === 'AMEX') {
    const amex = d.slice(0, 15);
    return [amex.slice(0, 4), amex.slice(4, 10), amex.slice(10)].filter(Boolean).join(' ');
  }
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Solo letras (con tildes/ñ) y espacios simples, en mayúsculas como en la tarjeta.
export const mascaraTitular = (valor) => String(valor ?? '')
  .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, '')
  .replace(/\s{2,}/g, ' ')
  .replace(/^\s/, '')
  .toUpperCase()
  .slice(0, 40);

// MM/AA con la barra automática: "1" → "1", "12" → "12/", "1227" → "12/27".
export function mascaraVencimiento(valor, anterior = '') {
  let d = soloDigitos(valor).slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = `0${d}`; // "5" → "05/"
  // Al borrar justo después de la barra no se vuelve a insertar.
  const borrando = String(valor ?? '').length < String(anterior ?? '').length;
  if (d.length >= 3) return `${d.slice(0, 2)}/${d.slice(2)}`;
  if (d.length === 2 && !borrando) return `${d}/`;
  return d;
}

export const mascaraCvv = (valor, marca) => soloDigitos(valor).slice(0, MARCAS[marca]?.largoCvv ?? 4);

// '' si es válida; mensaje en español si no. La tarjeta vence al terminar el mes indicado.
export function validarVencimiento(valor, hoy = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(valor ?? ''));
  if (!m) return 'Escribe la fecha como MM/AA.';
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return 'El mes debe estar entre 01 y 12.';
  const actual = hoy.getFullYear() * 12 + hoy.getMonth();
  if (anio * 12 + (mes - 1) < actual) return 'La tarjeta está vencida.';
  return '';
}

// Devuelve { numero, titular, vencimiento, cvv } con '' en cada campo válido.
export function validarTarjeta({ numero, titular, vencimiento, cvv }, hoy = new Date()) {
  const d = soloDigitos(numero);
  const marca = detectarMarca(d);
  let errNumero = '';
  if (!d) errNumero = 'Escribe el número de la tarjeta.';
  else if (d.length < 13 || d.length > 19) errNumero = 'El número debe tener de 13 a 19 dígitos.';
  else if (!marca) errNumero = 'Solo se aceptan Visa, Mastercard o American Express.';
  else if (!validarLuhn(d)) errNumero = 'El número de tarjeta no es válido.';

  const nombre = String(titular ?? '').trim();
  let errTitular = '';
  if (!nombre) errTitular = 'Escribe el nombre del titular.';
  else if (nombre.length < 3) errTitular = 'El nombre es demasiado corto.';

  const largoCvv = MARCAS[marca]?.largoCvv ?? 3;
  const c = soloDigitos(cvv);
  const errCvv = c.length === largoCvv && c.length === String(cvv ?? '').length
    ? ''
    : `El CVV debe tener ${largoCvv} dígitos.`;

  return { numero: errNumero, titular: errTitular, vencimiento: validarVencimiento(vencimiento, hoy), cvv: errCvv };
}

export const tarjetaValida = (campos, hoy) => Object.values(validarTarjeta(campos, hoy)).every((e) => !e);

// Autorización simulada de 6 dígitos (cumple la regla del backend para TARJETA: 6 a 12 dígitos).
export const generarAutorizacion = (aleatorio = Math.random) => String(Math.floor(aleatorio() * 1e6)).padStart(6, '0');

export class TarjetaRechazadaError extends Error {
  constructor() { super('Tarjeta rechazada (simulación)'); this.name = 'TarjetaRechazadaError'; }
}

/**
 * Simula la autorización: espera `demoraMs` (1 a 2 s) y aprueba o rechaza.
 * Resuelve SOLO con datos no sensibles: { marca, ultimos4, autorizacion }.
 */
export async function procesarPagoTarjeta(campos, { demoraMs = 1500, hoy = new Date(), esperar } = {}) {
  if (!tarjetaValida(campos, hoy)) throw new Error('Revisa los datos de la tarjeta.');
  const d = soloDigitos(campos.numero);
  const pausa = esperar ?? ((ms) => new Promise((r) => { setTimeout(r, ms); }));
  await pausa(demoraMs);
  if (RECHAZADAS.has(d)) throw new TarjetaRechazadaError();
  return { marca: detectarMarca(d), ultimos4: d.slice(-4), autorizacion: generarAutorizacion() };
}
