const limpio = (texto) => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E]/g, '?').replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');

// PDF mínimo de una página, sin binarios externos ni datos ejecutables en plantillas.
export function generarPdf(textos) {
  const paginas = [];
  for (let i = 0; i < textos.length; i += 48) paginas.push(textos.slice(i, i + 48));
  if (!paginas.length) paginas.push([]);
  const objetos = [null, null, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const referencias = [];
  paginas.forEach((lineas, i) => {
    const idPagina = 4 + i * 2;
    const idContenido = idPagina + 1;
    referencias.push(`${idPagina} 0 R`);
    const comandos = ['BT', '/F1 8 Tf', '48 800 Td', '14 TL', ...lineas.map((linea, j) => `${j ? 'T* ' : ''}(${limpio(linea)}) Tj`), 'ET'].join('\n');
    objetos[idPagina - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${idContenido} 0 R >>`;
    objetos[idContenido - 1] = `<< /Length ${new TextEncoder().encode(comandos).length} >>\nstream\n${comandos}\nendstream`;
  });
  objetos[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objetos[1] = `<< /Type /Pages /Kids [${referencias.join(' ')}] /Count ${paginas.length} >>`;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objetos.length; i++) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${objetos[i]}\nendobj\n`;
  }
  const inicio = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicio}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}
