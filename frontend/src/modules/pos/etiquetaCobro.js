import { formatoMoneda } from './impuestos.js';

export function etiquetaCobro(items, total) {
  return items.length ? `Cobrar ${formatoMoneda(total)}` : 'Cobrar';
}
