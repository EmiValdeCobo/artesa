// Simulación de pago por transferencia con QR (sin banco real). Lógica pura y testeable.
// Montos como string "0.00": se comparan en centavos enteros, nunca con float.

export const REFERENCIA_TRANSFERENCIA = { min: 6, max: 20, patron: /^[A-Z0-9]{6,20}$/ };

// Solo letras y números en mayúsculas, sin espacios ni guiones, máximo 20.
export const mascaraReferenciaTransferencia = (valor) => String(valor ?? '')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .slice(0, REFERENCIA_TRANSFERENCIA.max);

export function validarReferenciaTransferencia(valor) {
  const v = String(valor ?? '');
  if (!v) return 'Escribe el número de transferencia o referencia.';
  if (!REFERENCIA_TRANSFERENCIA.patron.test(v)) return 'La referencia debe tener de 6 a 20 letras o números, sin espacios.';
  return '';
}

const centavos = (s) => {
  const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(String(s ?? ''));
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
};
const aTexto = (c) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

/**
 * Compara el monto que el cliente transfirió con el monto aplicado a esta línea de pago.
 * estado: 'invalido' | 'insuficiente' | 'exacto' | 'excedente'. El excedente NO es vuelto en efectivo.
 */
export function evaluarMontoTransferencia(montoPagado, montoAplicado) {
  const pagado = centavos(montoPagado);
  const aplicado = centavos(montoAplicado) ?? 0;
  if (pagado === null || pagado <= 0) return { estado: 'invalido', mensaje: 'Escribe un monto pagado mayor a $0.00.' };
  if (pagado < aplicado) {
    return { estado: 'insuficiente', faltante: aTexto(aplicado - pagado), mensaje: `Faltan $${aTexto(aplicado - pagado)}. Agrega otro método para cubrir el resto.` };
  }
  if (pagado > aplicado) {
    return { estado: 'excedente', excedente: aTexto(pagado - aplicado), mensaje: `El cliente transfirió $${aTexto(pagado - aplicado)} de más. No se entrega vuelto en efectivo.` };
  }
  return { estado: 'exacto', mensaje: '' };
}

// Texto codificado en el QR: ARTESA-SIM|sucursal|monto|referencia.
export const textoQrTransferencia = ({ sucursal, monto, referencia }) =>
  ['ARTESA-SIM', String(sucursal ?? 'SUCURSAL').replace(/\|/g, ' '), monto, referencia].join('|');

// Referencia interna del cobro (la que aparece en el QR) y la que "devuelve el banco" al simular el escaneo.
export const generarReferenciaCobro = (ahora = new Date()) => `COB${ahora.getTime().toString(36).toUpperCase()}`;
export const generarReferenciaBanco = (aleatorio = Math.random) =>
  `TRX${Array.from({ length: 9 }, () => Math.floor(aleatorio() * 10)).join('')}`;
