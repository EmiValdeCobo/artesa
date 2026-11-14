// Cálculos auxiliares en centavos enteros; la función PostgreSQL conserva la autoridad del cierre.
export const centavos = (valor) => {
  const texto = String(valor);
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) throw new Error('Monto no válido');
  const [entero, decimal = ''] = texto.split('.');
  return Number(entero) * 100 + Number(decimal.padEnd(2, '0'));
};

export const formatoDinero = (valor) => (Number(valor) / 100).toFixed(2);

export function calcularRenta(baseCentavos, tramos) {
  const tramo = tramos.find((t) => baseCentavos >= centavos(t.desde)
    && (t.hasta == null || baseCentavos <= centavos(t.hasta)));
  if (!tramo) throw new Error('No existe tramo de renta para la base gravable');
  if (Number(tramo.porcentaje) === 0) return 0;
  const excedente = Math.max(0, baseCentavos - centavos(tramo.exceso_sobre));
  const cuota = centavos(tramo.cuota_fija);
  const porcentaje = Number(tramo.porcentaje);
  return Math.round(cuota + excedente * porcentaje);
}

export function calcularNeto({ bruto, isss, afp, renta, descuentos = 0, bonificaciones = 0 }) {
  const brutoCent = centavos(bruto) + centavos(bonificaciones);
  return formatoDinero(brutoCent - centavos(isss) - centavos(afp) - centavos(renta) - centavos(descuentos));
}
