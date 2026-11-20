// Pasarela SIMULADA para TARJETA y TRANSFERENCIA (no hay banco ni procesador real).
// Toda la lógica de pagos simulados vive aquí: para conectar una pasarela real se reemplaza este
// módulo (validar/normalizar + guardar metadatos) sin tocar ventas.service ni pos.fn_registrar_venta.
//
// SEGURIDAD: nunca se reciben ni guardan número completo, CVV ni vencimiento. El esquema Zod de
// ventas rechaza esos campos (objeto estricto) y aquí solo se mapean campos permitidos.

export const MARCAS_TARJETA = ['VISA', 'MASTERCARD', 'AMEX'];
export const METODOS_SIMULABLES = ['TARJETA', 'TRANSFERENCIA'];

const centavos = (s) => {
  const [e, d = '00'] = String(s).split('.');
  return Number(e) * 100 + Number(d.padEnd(2, '0').slice(0, 2));
};

/**
 * Reglas de negocio de un pago simulado (además del formato que valida Zod).
 * Devuelve lista de { path, message } (vacía si es válido).
 */
export function validarPagoSimulado(pago) {
  const errores = [];
  const add = (path, message) => errores.push({ path, message });
  const { metodo, simulado, tarjeta, monto, monto_recibido: recibido } = pago;

  if (tarjeta && metodo !== 'TARJETA') add(['tarjeta'], 'Los datos de tarjeta solo aplican al método TARJETA');
  if (simulado && !METODOS_SIMULABLES.includes(metodo)) add(['simulado'], `El método ${metodo} no admite pago simulado`);

  if (metodo === 'TARJETA') {
    if (simulado && !tarjeta) add(['tarjeta'], 'El pago con tarjeta simulado requiere marca y últimos 4 dígitos');
    if (recibido != null) add(['monto_recibido'], 'La tarjeta cobra el monto exacto: no admite monto recibido');
  }
  if (metodo === 'TRANSFERENCIA' && recibido != null && centavos(recibido) < centavos(monto)) {
    add(['monto_recibido'], 'El monto transferido no puede ser menor al monto aplicado; agrega otro método para el resto');
  }
  return errores;
}

// Fila que se pasa a pos.fn_registrar_venta (solo columnas originales de pos.pagos).
export const aPagoVenta = ({ metodo, monto, monto_recibido, referencia }) => ({
  metodo,
  monto,
  monto_recibido: monto_recibido ?? null,
  referencia: referencia ?? null,
});

// Metadatos de simulación que se guardan aparte (columnas de la migración 024). Nada sensible.
export const aMetadatosSimulacion = (pago) => ({
  metodo: pago.metodo,
  referencia: pago.referencia ?? null,
  simulado: pago.simulado === true,
  marca_tarjeta: pago.metodo === 'TARJETA' ? pago.tarjeta?.marca ?? null : null,
  ultimos4: pago.metodo === 'TARJETA' ? pago.tarjeta?.ultimos4 ?? null : null,
});

/**
 * Guarda los metadatos dentro de la misma transacción de la venta. Las filas las insertó la función SQL;
 * se identifican por (venta, método, referencia), que es único dentro de una venta.
 */
export async function guardarMetadatosSimulacion(tx, sequelize, idVenta, pagos) {
  for (const meta of pagos.map(aMetadatosSimulacion)) {
    if (!meta.simulado) continue;
    await sequelize.query(
      `UPDATE pos.pagos
          SET simulado = TRUE, marca_tarjeta = $4, ultimos4 = $5
        WHERE id_venta = $1::uuid AND metodo = $2 AND referencia = $3`,
      { bind: [idVenta, meta.metodo, meta.referencia, meta.marca_tarjeta, meta.ultimos4], transaction: tx },
    );
  }
}
