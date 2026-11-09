
export const IVA = 0.13;

export const PRECIOS_INCLUYEN_IVA = true;

const redondear = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const formatoMoneda = (n) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

// items: [{ precio, cantidad }] -> { subtotal, iva, total }
export function calcularTotales(items) {
  const bruto = items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
  if (PRECIOS_INCLUYEN_IVA) {
    const total = redondear(bruto);
    const subtotal = redondear(total / (1 + IVA));
    return { subtotal, iva: redondear(total - subtotal), total };
  }
  const subtotal = redondear(bruto);
  const iva = redondear(subtotal * IVA);
  return { subtotal, iva, total: redondear(subtotal + iva) };
}