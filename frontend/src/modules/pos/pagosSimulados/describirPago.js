// Texto corto de un pago para el detalle de venta y el ticket. Solo usa datos no sensibles.
const NOMBRE_MARCA = { VISA: 'Visa', MASTERCARD: 'Mastercard', AMEX: 'American Express' };

export function detallePago(p) {
  if (p.metodo === 'TARJETA' && p.ultimos4) {
    return `${NOMBRE_MARCA[p.marca_tarjeta] ?? 'Tarjeta'} •••• ${p.ultimos4}${p.referencia ? ` · Aut. ${p.referencia}` : ''}`;
  }
  if (p.metodo === 'TRANSFERENCIA' && p.referencia) return `Ref. ${p.referencia}`;
  return p.referencia ? `Ref. ${p.referencia}` : '';
}
