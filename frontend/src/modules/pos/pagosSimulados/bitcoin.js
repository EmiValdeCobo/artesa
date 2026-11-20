// Simulación de pago Bitcoin/Chivo Wallet. Lógica pura y testeable.
// Montos como string "0.00": se comparan en centavos enteros, nunca con float.

export const REFERENCIA_BITCOIN = { min: 8, max: 64, patron: /^[a-z0-9]{8,64}$/ };

export const mascaraReferenciaBitcoin = (valor) => String(valor ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .slice(0, REFERENCIA_BITCOIN.max);

export function validarReferenciaBitcoin(valor) {
  const v = String(valor ?? '');
  if (!v) return 'Escribe el ID de transacción o hash Lightning.';
  if (!REFERENCIA_BITCOIN.patron.test(v)) return 'El ID debe tener de 8 a 64 caracteres alfanuméricos en minúscula.';
  return '';
}

const centavos = (s) => {
  const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(String(s ?? ''));
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
};
const aTexto = (c) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

export function evaluarMontoBitcoin(montoPagado, montoAplicado) {
  const pagado = centavos(montoPagado);
  const aplicado = centavos(montoAplicado) ?? 0;
  if (pagado === null || pagado <= 0) return { estado: 'invalido', mensaje: 'Escribe un monto pagado mayor a $0.00.' };
  if (pagado < aplicado) {
    return { estado: 'insuficiente', faltante: aTexto(aplicado - pagado), mensaje: `Faltan $${aTexto(aplicado - pagado)}. Agrega otro método para cubrir el resto.` };
  }
  if (pagado > aplicado) {
    return { estado: 'excedente', excedente: aTexto(pagado - aplicado), mensaje: `El cliente pagó $${aTexto(pagado - aplicado)} de más en BTC. No se entrega vuelto en efectivo.` };
  }
  return { estado: 'exacto', mensaje: '' };
}

export const generarHashBitcoin = (aleatorio = Math.random) =>
  Array.from({ length: 16 }, () => Math.floor(aleatorio() * 16).toString(16)).join('');
