import { formatoDinero, formatoDineroCorto } from '../../../utils/formato.js';

// Eje Y con valores "redondos" (1, 2, 2.5, 5 × 10^n), como máximo 5 intervalos y ~8 % de aire sobre el
// dato mayor para que la barra más alta no toque el borde. Solo escala visual: no se opera con dinero.
export function calcularEje(maximo) {
  const objetivo = (Number.isFinite(maximo) && maximo > 0 ? maximo : 0) * 1.08 || 1;
  const base = 10 ** Math.floor(Math.log10(objetivo / 5));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    const paso = factor * base;
    const intervalos = Math.ceil(objetivo / paso);
    if (intervalos <= 5) return { paso, techo: paso * intervalos, marcas: Array.from({ length: intervalos + 1 }, (_, i) => paso * i) };
  }
  return { paso: objetivo, techo: objetivo, marcas: [0, objetivo] };
}

// Etiqueta de una marca del eje: sin decimales solo si el paso es entero (evita mostrar $2,5 como "$3").
export const formatoEje = (valor, paso) => (Number.isInteger(paso) ? formatoDineroCorto(valor) : formatoDinero(valor));
