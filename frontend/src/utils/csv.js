// Neutraliza celdas que una hoja de cálculo podría interpretar como fórmulas.
export function escaparCeldaCsv(valor) {
  const texto = String(valor ?? '');
  const seguro = /^[\u0000-\u0020]*[=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replaceAll('"', '""')}"`;
}
