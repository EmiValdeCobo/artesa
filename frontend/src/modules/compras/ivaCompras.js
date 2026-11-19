// Cálculos de IVA para compras SIN números de punto flotante.
// Todo se maneja como BigInt en "micros" (millonésimas de dólar, 6 decimales: igual que
// la máscara del costo unitario) y se redondea mitad hacia arriba, como ROUND() de PostgreSQL.
// Estos cálculos solo sirven para MOSTRAR una vista previa; el monto oficial lo calcula
// compras.fn_registrar_compra al guardar.

export const TIPOS_DOCUMENTO = [
  { valor: 'CCF', texto: 'Comprobante de crédito fiscal (CCF)' },
  { valor: 'CF', texto: 'Factura consumidor final (CF)' },
  { valor: 'FSE', texto: 'Sujeto excluido (FSE)' },
];

const ESCALA = 1000000n; // 6 decimales
const TASA_IVA_PORCENTAJE = 113n; // 1 + 13 %, expresado en centésimas

// '12.345' → 12345000n (micros). Devuelve null si el texto no es un decimal válido.
export function aMicros(valor) {
  const partes = /^(-?)(\d+)(?:\.(\d*))?$/.exec(String(valor ?? '').trim());
  if (!partes) return null;
  const micros = BigInt(partes[2]) * ESCALA + BigInt((partes[3] ?? '').padEnd(6, '0').slice(0, 6) || '0');
  return partes[1] ? -micros : micros;
}

// División entera con redondeo mitad hacia arriba (para valores no negativos).
const dividirRedondeando = (numerador, divisor) => (numerador * 2n + divisor) / (divisor * 2n);

// Redondea micros a centavos (2 decimales) y los devuelve aún en micros.
const redondearCentavos = (micros) => dividirRedondeando(micros, 10000n) * 10000n;

// Micros → texto decimal sin ceros sobrantes ('2.260000' → '2.26'), apto para el input.
export function microsATexto(micros) {
  const negativo = micros < 0n;
  const absoluto = negativo ? -micros : micros;
  const fraccion = String(absoluto % ESCALA).padStart(6, '0').replace(/0+$/, '');
  return `${negativo ? '-' : ''}${absoluto / ESCALA}${fraccion ? `.${fraccion}` : ''}`;
}

export const microsACentavos = (micros) => micros / 10000n;

// El costo promedio del inventario es NETO (sin IVA). En el formulario el usuario escribe
// el precio tal como viene en el documento: en CCF ese precio trae el 13 % incluido, así
// que el borrador debe multiplicarse por 1.13 para que, al quitarle el IVA en la BD,
// vuelva a dar el mismo costo neto. En CF/FSE el IVA no se separa y el costo va tal cual.
export function costoBorradorConIva(costoNeto, tipoDocumento) {
  const micros = aMicros(costoNeto);
  if (micros === null) return '';
  if (tipoDocumento !== 'CCF') return microsATexto(micros);
  return microsATexto(dividirRedondeando(micros * TASA_IVA_PORCENTAJE, 100n));
}

// Resumen en vivo: replica la fórmula de fn_registrar_compra línea por línea
// (total = ROUND(cant × precio, 2); subtotal = ROUND(total / 1.13, 2) solo en CCF).
export function resumenCompra(items, tipoDocumento) {
  let subtotal = 0n;
  let iva = 0n;
  let total = 0n;
  for (const linea of items) {
    const cantidad = aMicros(linea.cantidad);
    const precio = aMicros(linea.costoUnitario);
    if (cantidad === null || precio === null || cantidad <= 0n || precio < 0n) continue;
    const totalLinea = redondearCentavos(dividirRedondeando(cantidad * precio, ESCALA));
    const subtotalLinea = tipoDocumento === 'CCF'
      ? redondearCentavos(dividirRedondeando(totalLinea * 100n, TASA_IVA_PORCENTAJE))
      : totalLinea;
    subtotal += subtotalLinea;
    iva += totalLinea - subtotalLinea;
    total += totalLinea;
  }
  return { subtotal: microsACentavos(subtotal), iva: microsACentavos(iva), total: microsACentavos(total) };
}
